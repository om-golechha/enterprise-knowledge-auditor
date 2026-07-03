import concurrent.futures
from tenacity import retry, stop_after_attempt, RetryError

@retry(stop=stop_after_attempt(2))
def fail():
    raise ValueError("fail")

executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
futures = [executor.submit(fail)]
for future in concurrent.futures.as_completed(futures):
    try:
        print(future.result())
    except Exception as e:
        print("Caught Exception:", type(e), repr(e))
    except BaseException as e:
        print("Caught BaseException:", type(e), repr(e))
