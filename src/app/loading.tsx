export default function Loading() {
  return (
    <main id="main" className="loading-page" aria-busy="true">
      <p>Loading the planning workspace…</p>
      <div className="skeleton" />
    </main>
  );
}
