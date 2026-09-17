import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong.';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold text-text">{message}</h1>
      <Link to="/" className="text-accent hover:underline">
        ← Back to Library
      </Link>
    </div>
  );
}
