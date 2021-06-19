import { nanoid } from "nanoid";

export function createWorkerRunner<A>(worker: Worker) {
  const eventMap = new Map<
    string,
    {
      resolve: (data: any) => void;
      reject: (error: any) => void;
    }
  >();

  worker.onmessage = ({ data }) => {
    const e = eventMap.get(data.id);
    if (e) {
      if (data.error) {
        e.reject(data.error);
      } else {
        e.resolve(data.return);
      }
      eventMap.delete(data.id);
    }
  };

  function exec<T>(action: A, payload?: any, transfer: Transferable[] = []) {
    const id = nanoid();

    worker.postMessage(
      {
        id,
        action,
        ...payload,
      },
      transfer
    );

    return new Promise<T>((resolve, reject) => {
      eventMap.set(id, {
        reject,
        resolve,
      });
    });
  }

  return exec;
}
