/**
 * Une fermeture de la fenêtre ne doit pas quitter le main process tant que
 * Minecraft tourne : il conserve alors le heartbeat et les commandes admin.
 */
export function shouldHideMainWindowOnClose(input: {
  gameRunning: boolean;
  appQuitting: boolean;
}): boolean {
  return input.gameRunning && !input.appQuitting;
}
