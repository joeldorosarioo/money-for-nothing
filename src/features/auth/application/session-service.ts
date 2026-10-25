import {
    type AuthState, type LoginCredentials, type Registration, type Session, type SessionUser, type StoredSession
} from "../types/session";

function toError (error: unknown): Error {
  return error instanceof Error
    ? error : new Error("Não foi possível concluir esta operação.")
}

export function createSessionService (dependencies: {
  readonly repository: {
    login: (input: LoginCredentials, signal: AbortSignal) => Promise<Session>
    register: (input: Registration, signal: AbortSignal) => Promise<Session>
    current: (signal: AbortSignal) => Promise<Session>
    logout: (token: string) => Promise<void>
  }

  readonly persistence: {
    read: () => StoredSession | null
    write: (value: StoredSession | null) => void
  }

  readonly mergeGuestCart: (mergeId: string, signal: AbortSignal) => Promise<void>
  readonly createId: () => string
  readonly isUnauthorized?: (error: unknown) => boolean
}) {
  const {
    repository, persistence, mergeGuestCart, createId
  } = dependencies

  const listeners = new Set<() => void>();

  let saved = persistence.read();
  let controller = new AbortController();

  let state: AuthState = {
    status: "restoring",
    session: null,
    generation: 0,
    error: null,
    mergeError: null
  }

  function publish (next: AuthState) {
    state = next

    listeners.forEach((listener) => {
      listener()
    });
  }

  function save (value: typeof saved) {
    persistence.write(value);
    saved = value
  }

  function begin (status: AuthState["status"]) {
    controller.abort();
    controller = new AbortController();

    publish({
      status,
      session: null,
      generation: state.generation + 1,
      error: null,
      mergeError: null
    });

    return {
      signal: controller.signal,
      generation: state.generation
    }
  }

  function isCurrent (generation: number) {
    return state.generation === generation && !controller.signal.aborted
  }

  async function activate (session: Session, generation: number, signal: AbortSignal) {
    if (!isCurrent(generation)) return

    const mergeId = saved?.pendingMergeId
    let mergeError: Error | null = null

    if (mergeId) {
      try {
        await mergeGuestCart(mergeId, signal);
        if (!isCurrent(generation)) return
        save({ token: session.token, pendingMergeId: null });
      } catch (error) {
        if (!isCurrent(generation)) return

        if (dependencies.isUnauthorized?.(error)) {
          expire(session.token);
          return
        }

        mergeError = toError(error);
      }
    }

    publish({
      status: "authenticated",
      session,
      generation,
      error: null,
      mergeError
    });
  }

  async function authenticate (request: (signal: AbortSignal) => Promise<Session>) {
    save(null);

    const {
      signal, generation
    } = begin("activating");

    try {
      const session = await request(signal);

      if (!isCurrent(generation)) return
      save({ token: session.token, pendingMergeId: createId() });
      await activate(session, generation, signal);
    } catch (error) {
      if (!isCurrent(generation)) return

      save(null);

      publish({
        ...state, status: "guest", error: toError(error)
      });

      throw error
    }
  }

  async function restore () {
    const { signal, generation } = begin("restoring");

    if (!saved) {
      publish({ ...state, status: "guest" });
      return
    }

    try {
      const session = await repository.current(signal);
      await activate(session, generation, signal);
    } catch (error) {
      if (!isCurrent(generation)) return

      if (dependencies.isUnauthorized?.(error)) {
        expire(saved.token);
      } else {
        publish({
          ...state, status: "unavailable", error: toError(error)
        });
      }
    }
  }

  function expire (expectedToken: string) {
    if (saved?.token !== expectedToken) return

    save(null);
    begin("guest");
  }

  return {
    getSnapshot: () => state,
    getToken: () => saved?.token ?? null,

    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      }
    },

    restore,
    login: (input: LoginCredentials) => authenticate((signal) => repository.login(input, signal)),
    register: (input: Registration) => authenticate((signal) => repository.register(input, signal)),

    async logout () {
      const token = saved?.token

      save(null);
      begin("guest");
      if (token) await repository.logout(token);
    },

    async retryMerge () {
      const session = state.session
      if (!session || !saved?.pendingMergeId) return

      const { generation, signal } = begin("activating");

      await activate(session, generation, signal);
    },

    expire,

    updateUser (user: SessionUser, expectedToken: string) {
      if (state.session?.token !== expectedToken) return
      publish({ ...state, session: { ...state.session, user } });
    },
  }
}

export type SessionService = ReturnType<typeof createSessionService>
