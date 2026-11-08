import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';
// shadcn-style primitive; native button semantics or a single semantic link child.
const variants = cva('button', {
  variants: {
    variant: {
      default: 'button-primary',
      secondary: 'button-secondary',
      ghost: 'button-ghost',
      accent: 'button-accent',
    },
  },
  defaultVariants: { variant: 'default' },
});
export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return <Component className={twMerge(clsx(variants({ variant }), className))} {...props} />;
}
