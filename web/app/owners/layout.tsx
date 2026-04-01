import OwnerProviders from './providers';
import OwnerNav from './nav';

export default function OwnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OwnerProviders>
      <OwnerNav />
      <main className="flex-1">{children}</main>
    </OwnerProviders>
  );
}
