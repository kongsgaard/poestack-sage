import { SAGE_VERSION } from '../version'

export function PluginPageFooter() {
  return (
    <div className="bg-background brightness-75 fixed bottom-0 h-7 w-full pr-14 flex">
      <div className="flex-1"></div>
      <div className="text-gray-600 text-xs h-full flex items-center">{SAGE_VERSION}</div>
    </div>
  )
}
