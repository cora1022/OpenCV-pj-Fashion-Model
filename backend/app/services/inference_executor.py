from functools import partial

import anyio

from backend.app.core.errors import AppError


class InferenceExecutor:
    def __init__(self, max_concurrency: int, queue_timeout_seconds: float) -> None:
        self._limiter = anyio.CapacityLimiter(max(1, max_concurrency))
        self._queue_timeout_seconds = queue_timeout_seconds

    async def run(self, function, *args, **kwargs):
        try:
            with anyio.fail_after(self._queue_timeout_seconds):
                await self._limiter.acquire()
        except TimeoutError:
            raise AppError(
                "SEARCH_BUSY", "검색 요청이 많습니다. 잠시 후 다시 시도해주세요.", 429
            ) from None

        try:
            return await anyio.to_thread.run_sync(partial(function, *args, **kwargs))
        finally:
            self._limiter.release()
