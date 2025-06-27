import React from 'react';

// `useEffect` is not invoked during server rendering, meaning
// we can use this to determine if we're on the server or not.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const [value, setValue] = React.useState<S | C>(server);
  const lastClientRef = React.useRef<C | null>(null);

  React.useEffect(() => {
    if (lastClientRef.current !== client) {
      lastClientRef.current = client;
      setValue(client);
    }
  }, [client]);

  return value;
}
