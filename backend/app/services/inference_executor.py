import asyncio
from functools import partial

import anyio

from backend.app.core.errors import AppError


class InferenceExecutor:
    def __init__(
        self,
        max_concurrency: int,
        queue_timeout_seconds: float,
        execution_timeout_seconds: float = 45.0,
    ) -> None:
        self._limiter = anyio.CapacityLimiter(max(1, max_concurrency))
        self._queue_timeout_seconds = queue_timeout_seconds
        self._execution_timeout_seconds = execution_timeout_seconds
        self._running_tasks: set[asyncio.Task] = set()

    async def run(self, function, *args, **kwargs):
        borrower = object()
        try:
            with anyio.fail_after(self._queue_timeout_seconds):
                await self._limiter.acquire_on_behalf_of(borrower)
        except TimeoutError:
            raise AppError(
                "SEARCH_BUSY", "검색 요청이 많습니다. 잠시 후 다시 시도해주세요.", 429
            ) from None

        async def execute():
            try:
                return await anyio.to_thread.run_sync(partial(function, *args, **kwargs))
            finally:
                self._limiter.release_on_behalf_of(borrower)

        task = asyncio.create_task(execute())
        self._running_tasks.add(task)
        task.add_done_callback(self._task_completed)
        try:
            with anyio.fail_after(self._execution_timeout_seconds):
                return await asyncio.shield(task)
        except TimeoutError:
            raise AppError(
                "SEARCH_TIMEOUT", "검색 처리 시간이 초과되었습니다. 다시 시도해주세요.", 504
            ) from None

    def _task_completed(self, task: asyncio.Task) -> None:
        self._running_tasks.discard(task)
        if not task.cancelled():
            task.exception()
