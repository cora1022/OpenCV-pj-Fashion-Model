import time

import anyio

from backend.app.core.errors import AppError
from backend.app.services.inference_executor import InferenceExecutor


async def test_queue_timeout_returns_search_busy():
    executor = InferenceExecutor(max_concurrency=1, queue_timeout_seconds=0.01)
    errors = []

    async def slow():
        await executor.run(time.sleep, 0.08)

    async def queued():
        await anyio.sleep(0.005)
        try:
            await executor.run(lambda: None)
        except AppError as exc:
            errors.append(exc.code)

    async with anyio.create_task_group() as group:
        group.start_soon(slow)
        group.start_soon(queued)

    assert errors == ["SEARCH_BUSY"]
