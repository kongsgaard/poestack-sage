import { ECHO_CONTEXT_SERVICE, EchoPluginHook, EchoRoute } from 'echo-common'
import { I18nextProvider } from 'react-i18next'
import i18nInstance from './config/i18n.config'
import { type i18n } from 'i18next'
// noinspection JSUnusedGlobalSymbols
import App from './App'
import { ArchiveBoxIcon } from '@heroicons/react/24/outline'
import { Suspense } from 'react'

export function context() {
  return ECHO_CONTEXT_SERVICE.context('plugin')
}

const Root = () => {
  return (
    <Suspense>
      {/* This will overwrite the default i18n in the main app*/}
      <I18nextProvider i18n={i18nInstance as i18n}>
        <App />
      </I18nextProvider>
    </Suspense>
  )
}

const pluginRoute: EchoRoute = {
  plugin: 'example-stash',
  path: 'main',
  page: Root,
  navItems: [{ location: 'l-sidebar-m', icon: ArchiveBoxIcon, displayname: 'Stash search' }]
}

function start() {
  context().router.registerRoute(pluginRoute)
}

function destroy() {
  context().router.unregisterRoute(pluginRoute)
}

export default function (): EchoPluginHook {
  return {
    start: start,
    destroy: destroy
  }
}
