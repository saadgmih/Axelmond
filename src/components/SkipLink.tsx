interface SkipLinkProps {
  href?: string;
}

export default function SkipLink({ href = "#main-content" }: SkipLinkProps) {
  return (
    <a href={href} className="skip-link kbd-nav-focus">
      Aller au contenu principal
    </a>
  );
}
