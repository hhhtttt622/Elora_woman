import Link from 'next/link';

export type ButtonVariant = 'primary' | 'secondary' | 'link' | 'danger' | 'danger-outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn',
  secondary: 'ghost',
  link: 'textbtn',
  danger: 'btn ui-danger',
  'danger-outline': 'ghost ui-danger',
};

/** Dựa trên class sẵn có (.btn, .ghost, .textbtn) để giữ nguyên nhận diện. */
export function buttonClass(variant: ButtonVariant = 'primary', size?: ButtonSize, extra = '') {
  const base = BUTTON_VARIANTS[variant] || 'btn';
  return [base, size ? `ui-${size}` : '', extra].filter(Boolean).join(' ');
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode };

export function Button({ variant, size, className, type = 'button', ...rest }: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function LinkButton({ variant, size, className, href, ...rest }: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return <Link href={href} className={buttonClass(variant, size, className)} {...rest} />;
}
