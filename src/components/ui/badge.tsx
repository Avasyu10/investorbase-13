
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-600 text-white hover:bg-blue-600/80 dark:bg-blue-500 dark:hover:bg-blue-500/80",
        secondary:
          "border-transparent bg-amber-600 text-white hover:bg-amber-600/80 dark:bg-amber-500 dark:hover:bg-amber-500/80",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-600/80 dark:bg-red-500 dark:hover:bg-red-500/80",
        outline: 
          "border-transparent bg-orange-600 text-white hover:bg-orange-600/80 dark:bg-orange-500 dark:hover:bg-orange-500/80",
        gold: 
          "bg-amber-100/80 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/90 border-amber-200 dark:border-amber-800",
        green:
          "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/80 dark:bg-emerald-500 dark:hover:bg-emerald-500/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
