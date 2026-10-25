import { scenarioHandlers, scenarioMiddleware } from "./simulation/scenario-handlers";
import { socketHandler } from "./realtime/socket-handler";
import { profileHandlers } from "./profile/profile-handlers";
import { checkoutHandlers } from "./checkout/checkout-handlers";
import { orderHandlers } from "./orders/order-handlers";
import { controlHandlers } from "./simulation/control-handlers";
import { walletHandlers } from "./wallets/wallet-handlers";
import { authHandlers } from "./auth/auth-handlers";
import { cartHandlers } from "./cart/cart-handlers";
import { catalogHandlers } from "./catalog/catalog-handlers";
import { favoriteHandlers } from "./favorites/favorite-handlers";
import { resetState } from "./persistence/state-store";

export function createHandlers (databaseName: string) {
  return [
    socketHandler(databaseName),
    scenarioMiddleware(databaseName),
    ...scenarioHandlers(databaseName),
    ...authHandlers(databaseName),
    ...profileHandlers(databaseName),
    ...catalogHandlers(databaseName),
    ...favoriteHandlers(databaseName),
    ...cartHandlers(databaseName),
    ...walletHandlers(databaseName),
    ...checkoutHandlers(databaseName),
    ...orderHandlers(databaseName),
    ...controlHandlers(databaseName),
  ]
}

export async function resetSimulation (databaseName: string, scenario: string): Promise<void> {
  await resetState(databaseName, scenario)
}
