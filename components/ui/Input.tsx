"use client";

import { RiEyeFill, RiEyeOffFill, RiSearchLine } from "@remixicon/react";
import * as React from "react";
import { tv, type VariantProps } from "tailwind-variants";

import { cx, focusInput, focusRing, hasErrorInput } from "@/lib/utils";

const inputStyles = tv({
  base: [
    "relative block w-full appearance-none rounded-md border px-2.5 py-2 shadow-sm outline-none transition sm:text-sm",
    "border-gray-300 dark:border-gray-800",
    "text-gray-900 dark:text-gray-50",
    "placeholder-gray-400 dark:placeholder-gray-500",
    "bg-white dark:bg-gray-950",
    "disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400",
    "disabled:dark:border-gray-700 disabled:dark:bg-gray-800 disabled:dark:text-gray-500",
    [
      "file:-my-2 file:-ml-2.5 file:cursor-pointer file:rounded-l-[5px] file:rounded-r-none file:border-0 file:px-3 file:py-2 file:outline-none focus:outline-none disabled:pointer-events-none file:disabled:pointer-events-none",
      "file:border-solid file:border-gray-300 file:bg-gray-50 file:text-gray-500 file:hover:bg-gray-100 file:dark:border-gray-800 file:dark:bg-gray-950 file:hover:dark:bg-gray-900/20 file:disabled:dark:border-gray-700",
      "file:[border-inline-end-width:1px] file:[margin-inline-end:0.75rem]",
      "file:disabled:bg-gray-100 file:disabled:text-gray-500 file:disabled:dark:bg-gray-800",
    ],
    ...focusInput,
    "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
  ],
  variants: {
    hasError: {
      true: [...hasErrorInput],
    },
    enableStepper: {
      false: "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
    },
  },
});

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputStyles> & {
    label?: string;
    inputClassName?: string;
  };

const InputInner = React.forwardRef<HTMLInputElement, Omit<InputProps, "label">>(
  (
    { className, inputClassName, hasError, enableStepper = true, type, id, name, ...props }: Omit<InputProps, "label">,
    forwardedRef,
  ) => {
    const [typeState, setTypeState] = React.useState(type);
    const isPassword = type === "password";
    const isSearch = type === "search";

    return (
      <div className={cx("relative w-full", className)}>
        <input
          ref={forwardedRef}
          id={id ?? name}
          type={isPassword ? typeState : type}
          className={cx(
            inputStyles({ hasError, enableStepper }),
            {
              "pl-8": isSearch,
              "pr-10": isPassword,
            },
            inputClassName,
          )}
          name={name}
          {...props}
        />
        {isSearch && (
          <div className="pointer-events-none absolute bottom-0 left-2 flex h-full items-center justify-center text-gray-400 dark:text-gray-600">
            <RiSearchLine className="size-[1.125rem] shrink-0" aria-hidden="true" />
          </div>
        )}
        {isPassword && (
          <div className="absolute bottom-0 right-0 flex h-full items-center justify-center px-3">
            <button
              aria-label={typeState === "password" ? "Afficher le mot de passe" : "Masquer le mot de passe"}
              className={cx(
                "h-fit w-fit rounded-sm outline-none transition-all text-gray-400 dark:text-gray-600",
                "hover:text-gray-500 hover:dark:text-gray-500",
                focusRing,
              )}
              type="button"
              onClick={() => setTypeState(typeState === "password" ? "text" : "password")}
            >
              <span className="sr-only">{typeState === "password" ? "Afficher" : "Masquer"}</span>
              {typeState === "password" ? (
                <RiEyeFill aria-hidden="true" className="size-5 shrink-0" />
              ) : (
                <RiEyeOffFill aria-hidden="true" className="size-5 shrink-0" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  },
);

InputInner.displayName = "InputInner";

export function Input({ label, className, id, name, ...rest }: InputProps) {
  if (label) {
    return (
      <label className={cx("block w-full text-sm", className)}>
        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <InputInner id={id} name={name} {...rest} />
      </label>
    );
  }
  return <InputInner id={id} name={name} className={className} {...rest} />;
}
