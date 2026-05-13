import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In — IdeaMash',
  description: 'Log in to your IdeaMash account to share and judge startup ideas.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
