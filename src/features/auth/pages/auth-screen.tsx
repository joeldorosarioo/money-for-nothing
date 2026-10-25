import { Link, useNavigate } from "@tanstack/react-router";
import React, { type MouseEvent } from "react";
import { useForm } from "react-hook-form";

import { FeatureNotice } from "../../../shared/components/feature-notice";
import { PasswordInput } from "../../../shared/components/password-input";
import { ApiClientError, explainError } from "../../../shared/http/api-client-error";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../shared/ui/dialog";
import { Input } from "../../../shared/ui/input";
import { loginSchema, registerSchema } from "../api/auth-contracts";
import { useAuth } from "../hooks/auth-context";
import { type AuthDialogMode } from "../hooks/auth-dialog-context";
import { type Registration } from "../types/session";

function isField (value: unknown): value is keyof Registration {
  return value === "username" || value === "email" || value === "password" || value === "confirmPassword"
}

export function AuthScreen ({ mode, redirect, onClose, onModeChange, onRestoreFocus }: {
  readonly mode: AuthDialogMode
  readonly redirect: string
  readonly onRestoreFocus?: () => void
  readonly onClose?: () => void
  readonly onModeChange?: (mode: AuthDialogMode) => void
}) {
  const { service, status } = useAuth();

  const navigate = useNavigate()
  const signup = mode === "signup"

  const {
    register,
    handleSubmit,
    setError,

    formState: {
      errors,
      isSubmitting
    }
  } = useForm<Registration>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  async function submit (values: Registration) {
    const parsed = signup
      ? { mode: "signup" as const, ...registerSchema.safeParse(values) }
      : { mode: "login" as const, ...loginSchema.safeParse(values) }

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (isField(field)) setError(field, { message: issue.message }, { shouldFocus: true });
      }

      return
    }

    try {
      if (parsed.mode === "signup") await service.register(parsed.data);
      else await service.login(parsed.data);

      if (service.getSnapshot().status === "authenticated") {
        onClose?.();

        if (!onClose) await navigate({
          to: redirect,
          resetScroll: false
        });
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (isField(field)) setError(field, { message }, { shouldFocus: true })
        }
      }

      setError("root", {
        message: explainError(error)
      });
    }
  }

  function closeDialog () {
    if (onClose) onClose();
    else void navigate({ to: "/" });
  }

  function selectMode (event: MouseEvent<HTMLAnchorElement>, next: AuthDialogMode) {
    if (!onModeChange || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault();
    onModeChange(next);
  }

  const fieldAttributes = (field: keyof Registration) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? "auth-" + field + "-error" : undefined,
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) closeDialog() }}>
      <DialogContent
        variant="auth"
        showCloseButton={false}
        onOpenAutoFocus={(event) => { if (!onClose) event.preventDefault() }}

        className={cn(
          "absolute top-0 left-0 z-61 block max-w-none gap-0 max-h-none min-h-dvh w-full translate-x-0 translate-y-0 overflow-visible rounded-none border-0 bg-background px-7 pt-20 pb-6",
          "desktop:top-40 desktop:left-1/2 desktop:min-h-150 desktop:w-125 desktop:-translate-x-1/2 desktop:rounded-lg desktop:bg-card desktop:px-0 desktop:pt-12 desktop:pb-25.75",
          "desktop:after:absolute desktop:after:inset-x-0 desktop:after:bottom-0 desktop:after:h-2.5 desktop:after:bg-primary desktop:after:content-['']",

          onClose && "fixed top-0 max-h-dvh overflow-y-auto desktop:top-1/2 desktop:max-h-[calc(100dvh-48px)] desktop:min-h-0 desktop:-translate-y-1/2",
          signup && !onClose && "desktop:top-39.5 desktop:min-h-164",
          signup && "desktop:pb-17.75",
        )}

        onCloseAutoFocus={(event) => {
          if (!onRestoreFocus) return
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <Link className="grid h-34 place-items-center text-[32px] leading-8 font-bold tracking-widest desktop:hidden" to="/">
          KURIO
        </Link>

        <div className="hidden items-center justify-center gap-2.25 text-xl leading-5 desktop:flex [&_a[aria-current]]:text-accent">
          <Link
            to="/login"
            search={{ redirect }}
            onClick={(event) => { selectMode(event, "login") }}
            aria-current={!signup ? "page" : undefined}
          >
            Entrar
          </Link>

          <span className="ml-3 h-5 w-px bg-panel-border" aria-hidden="true" />

          <Link
            to="/signup"
            search={{ redirect }}
            onClick={(event) => { selectMode(event, "signup") }}
            aria-current={signup ? "page" : undefined}
          >
            Criar conta
          </Link>
        </div>

        <DialogTitle className={cn("mt-10 mb-0 block text-center text-xl leading-4 font-bold desktop:hidden", signup && "text-lg")}>
          {signup ? "Criar perfil de colecionador" : "Entrar"}
        </DialogTitle>

        <DialogDescription className="mx-12 mt-10 mb-0 hidden text-center text-[13px] leading-4 text-foreground desktop:block">
          {
            signup
              ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
              : "Entre para gerenciar sua carteira, coleção e perfil de criador."
          }
        </DialogDescription>

        <form noValidate className="mt-10 p-0 desktop:mt-6 desktop:px-20" onSubmit={(event) => { void handleSubmit(submit)(event) }}>
          <div className={cn("flex flex-col gap-3 [&_input]:h-12.5 [&_input]:rounded-[10px] [&_input]:border-border [&_input]:bg-transparent [&_input]:pl-4 [&_input]:text-sm desktop:[&_input]:h-10 desktop:[&_input]:rounded-input", signup && "max-desktop:[&>div:first-child_input]:text-center")}>
            {signup && (
              <div>
                <Input
                  aria-label="Nome de usuário"
                  autoComplete="username"
                  placeholder="Nome de usuário"

                  {...register("username")} {...fieldAttributes("username")}
                />

                {errors.username && (
                  <p className="mt-1.5 text-xs leading-4.5 text-destructive" id="auth-username-error">
                    {errors.username.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <Input
                aria-label="E-mail"
                type="email"
                autoComplete="email"
                placeholder={signup ? "Digite seu e-mail" : "contato@email.com"}

                {...register("email")} {...fieldAttributes("email")}
              />

              {errors.email && (
                <p className="mt-1.5 text-xs leading-4.5 text-destructive" id="auth-email-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <PasswordInput
                aria-label="Senha"
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={signup ? "Senha" : "***********"}

                {...register("password")} {...fieldAttributes("password")}
              />

              {errors.password && (
                <p className="mt-1.5 text-xs leading-4.5 text-destructive" id="auth-password-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {signup && (
              <div>
                <PasswordInput
                  aria-label="Confirmar senha"
                  placeholder="Confirmar senha"
                  autoComplete="new-password"

                  {...register("confirmPassword")} {...fieldAttributes("confirmPassword")}
                />

                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs leading-4.5 text-destructive" id="auth-confirmPassword-error">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {!signup && (
            <div className="mt-3 text-right text-sm leading-4 text-muted-foreground">
              <FeatureNotice title="Recuperar senha">
                <button type="button">Esqueceu a senha?</button>
              </FeatureNotice>
            </div>
          )}

          {errors.root && (
            <p className="mt-1.5 text-xs leading-4.5 text-destructive" role="alert">{errors.root.message}</p>
          )}

          <Button
            type="submit" disabled={isSubmitting || status === "activating"}
            className="mt-10 h-15 w-full rounded-[10px] text-base font-bold desktop:mt-6 desktop:h-11.25 desktop:rounded-control"
          >
            {isSubmitting ? "Aguarde..." : signup ? (
              <React.Fragment>
                <span className="hidden desktop:block">Criar conta</span>
                <span className="block desktop:hidden">Criar perfil</span>
              </React.Fragment>
            ) : "Entrar"}
          </Button>
        </form>

        <div className="mt-10 flex flex-col gap-4 desktop:mt-6 desktop:gap-3">
          <p className="-mb-1 flex items-center gap-3 text-[13px] leading-4 text-muted-foreground before:h-px before:flex-1 before:bg-panel-border before:content-[''] after:h-px after:flex-1 after:bg-panel-border after:content-[''] desktop:mb-0">
            <span>Ou continue com</span>
          </p>

          {(["Google", "Facebook"] as const).map((provider) => (
            <FeatureNotice key={provider} title={"Continuar com " + provider}>
              <Button variant="outline" className="mx-auto h-10 w-full rounded-control border-panel-border text-[13px] text-muted-foreground desktop:w-85 [&_img]:size-5">
                <img src={"/assets/figma-" + provider.toLowerCase() + ".svg"} alt="" /> {"Continuar com " + provider}
              </Button>
            </FeatureNotice>
          ))}
        </div>

        <p className="mt-10 block text-center text-[15px] leading-5 desktop:hidden [&_a]:text-accent">
          {signup ? "Já tem uma conta? " : "Novo na Kurio? "}

          <Link
            to={signup ? "/login" : "/signup"}
            search={{ redirect }}
            onClick={(event) => { selectMode(event, signup ? "login" : "signup") }}
          >
            {signup ? "Entre" : "Crie uma conta"}
          </Link>
        </p>

        <DialogClose className={cn("absolute top-1 right-2.5 hidden size-7.5 text-[26px] text-muted-foreground desktop:block", onClose && "top-3 right-3 block size-11")} aria-label="Fechar">
          ×
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
