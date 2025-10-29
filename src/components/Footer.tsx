export function Footer() {
  return (
    <footer className="border-t border-[#e0d7cc] bg-alabaster py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
        <p className="heading-serif text-lg text-ink/80">ArchiMeuble — Le sur-mesure à la française</p>
        <p className="text-sm text-ink/60">© {new Date().getFullYear()} ArchiMeuble. Tous droits réservés.</p>
      </div>
    </footer>
  );
}