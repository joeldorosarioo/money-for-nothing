import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ArtworkImage } from "../../../shared/components/artwork-image";
import { ErrorState } from "../../../shared/components/async-state";
import { FormField } from "../../../shared/components/form-field";
import { PasswordInput } from "../../../shared/components/password-input";
import { ApiClientError, explainError } from "../../../shared/http/api-client-error";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { useAuth } from "../../auth/index";
import { type ProfileApi } from "../api/profile-api";
import { profileInputSchema } from "../api/profile-contracts";
import { type CollectorProfile } from "../types/collector-profile";

interface ProfileValues {
  displayName: string
  username: string
  email: string
  ens: string
  walletNickname: string
  currentPassword: string
  password: string
  confirmPassword: string
}

const identityFields = [
  ["displayName", "Nome de exibição"],
  ["username", "Nome de usuário"],
  ["email", "E-mail"],
  ["ens", "Nome ENS"],
  ["walletNickname", "Apelido da carteira"],
] as const

const passwordFields = [
  ["currentPassword", "Senha atual"],
  ["password", "Nova senha"],
  ["confirmPassword", "Confirmar nova senha"],
] as const

function isProfileField (value: string): value is keyof ProfileValues {
  return [...identityFields, ...passwordFields].some(([field]) => field === value)
}

function ProfileForm ({ profile, api, onSaved }: {
  readonly profile: CollectorProfile
  readonly api: ProfileApi
  readonly onSaved: (next: CollectorProfile, token: string) => void
}) {
  const { session, service } = useAuth()
  const [avatar, setAvatar] = useState(profile.avatarUrl)
  const [uploadError, setUploadError] = useState("")

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ProfileValues>({
    defaultValues: {
      ...profile,
      ens: profile.ens.replace(/\.eth$/, ""),
      currentPassword: "",
      password: "",
      confirmPassword: ""
    },
  })

  async function uploadAvatar (file: File | undefined) {
    if (!file) return
    setUploadError("")

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setUploadError("Use uma imagem PNG, JPEG ou WebP de até 2 MB.")
      return
    }

    try {
      const bitmap = await createImageBitmap(file)
      bitmap.close()

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => { reject(new Error("Não foi possível ler a imagem.")) }

        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result)
          else reject(new Error("Formato de imagem inválido."))
        }

        reader.readAsDataURL(file)
      })

      setAvatar(dataUrl)
    } catch {
      setUploadError("Não foi possível abrir esta imagem. Escolha outro arquivo.")
    }
  }

  async function submit (values: ProfileValues) {
    if (!session) return
    const token = session.token
    const hasPasswordChange = Boolean(values.currentPassword || values.password || values.confirmPassword)

    const parsed = profileInputSchema.safeParse({
      ...values,
      avatarUrl: avatar,
      ens: values.ens.trim().replace(/\.eth$/i, "") + ".eth",
      expectedVersion: profile.version,
      ...(hasPasswordChange ? {
        passwordChange: {
          currentPassword: values.currentPassword,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }
      } : {}),
    })

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path.at(-1))
        if (isProfileField(field)) setError(field, { message: issue.message }, { shouldFocus: true })
      }

      return
    }

    try {
      const next = await api.save(parsed.data)
      if (service.getSnapshot().session?.token === token) onSaved(next, token)
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, message] of Object.entries(error.fields)) {
          const name = field.split(".").at(-1) ?? ""
          if (isProfileField(name)) setError(name, { message }, { shouldFocus: true })
        }
      }

      setError("root", { message: explainError(error) })
    }
  }

  const accessibility = (field: keyof ProfileValues) => ({
    "id": "profile-" + field,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? "profile-" + field + "-error" : undefined,
  })

  return (
    <form className="mt-6" noValidate onSubmit={(event) => { void handleSubmit(submit)(event) }}>
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
        {identityFields.map(([field, label]) => (
          <FormField key={field} id={"profile-" + field} label={label} required error={errors[field]?.message}>
            {field === "ens" ? (
              <div className="flex gap-3">
                <span className="flex min-w-20 items-center rounded-input border border-input bg-transparent px-3">
                  .eth
                </span>

                <Input className="h-11" {...register(field)} {...accessibility(field)} />
              </div>
            ) : (
              <Input
                className="h-11"
                type={field === "email" ? "email" : "text"}
                autoComplete={field === "email" ? "email" : field === "username" ? "username" : "off"}
                {...register(field)} {...accessibility(field)}
              />
            )}
          </FormField>
        ))}

        <div className="block">
          <p className="text-sm leading-6">Avatar</p>

          <div className="mt-2 flex min-h-12 flex-wrap items-center gap-4 text-sm">
            <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-raised">
              {avatar ? (
                <ArtworkImage sizes="50px" className="size-full object-cover" src={avatar} alt="Seu avatar" />
              ) : (
                <img className="size-6" src="/assets/figma-avatar-placeholder.svg" alt="" />
              )}
            </div>

            <Button asChild className="min-w-24 cursor-pointer px-4 py-3 font-bold">
              <Label htmlFor="avatar-upload">Alterar</Label>
            </Button>

            <input
              className="sr-only"
              id="avatar-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Alterar avatar"
              onChange={(event) => { void uploadAvatar(event.target.files?.[0]) }}
            />

            <button className="min-h-11 px-3" type="button" onClick={() => { setAvatar("") }}>Remover</button>
          </div>

          {uploadError && <p className="mt-2 text-xs leading-5 text-destructive" role="alert">{uploadError}</p>}
        </div>
      </div>

      <fieldset className="mt-8 block border-0 p-0">
        <legend className="mb-4 text-base leading-6 font-medium">Alterar senha</legend>

        {passwordFields.map(([field, label]) => (
          <FormField
            variant="password"
            className="w-full desktop:w-[calc(50%-12px)] [&+[data-slot=field]]:mt-6"
            key={field}
            id={"profile-" + field}
            label={label}
            error={errors[field]?.message}
          >
            <PasswordInput
              className="h-11"
              {...register(field)} {...accessibility(field)}
              autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
            />
          </FormField>
        ))}
      </fieldset>

      {errors.root && (
        <div className="mt-2 text-xs leading-5 text-destructive" role="alert">
          <p>{errors.root.message}</p>
        </div>
      )}

      <Button
        className="mt-8 min-w-32 px-6 py-3 text-sm font-bold"
        type="submit"
        disabled={isSubmitting}
        aria-label="Salvar alterações"
      >
        {isSubmitting ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  )
}

export function ProfileScreen ({ api }: { readonly api: ProfileApi }) {
  const { scope, session, service } = useAuth()

  const client = useQueryClient()

  const [message, setMessage] = useState("")

  const queryKey = ["private", scope, "profile"]
  const query = useQuery({ queryKey, queryFn: ({ signal }) => api.get(signal), enabled: Boolean(session) })

  return (
    <section className="min-w-0">
      <h1 className="text-xl leading-7 font-bold">Perfil do colecionador</h1>

      {message && <p className="mt-4 text-sm text-muted-foreground" role="status">{message}</p>}

      {query.isPending ? (
        <p aria-live="polite">Carregando perfil…</p>
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => { void query.refetch() }} />
      ) : (
        <ProfileForm
          key={query.data.id + ":" + query.data.version.toString()}
          profile={query.data}
          api={api}
          onSaved={(next, token) => {
            client.setQueryData(queryKey, next)
            service.updateUser(next, token)
            setMessage("Perfil atualizado.")
          }}
        />
      )}
    </section>
  )
}
