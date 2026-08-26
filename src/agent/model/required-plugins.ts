import { Model } from 'react-object-model'

import { t } from '@i18n'
import { model } from '@model'


export const REQUIRED_FILE_PLUGINS = ['ModelInference', 'DocParser'] as const

export type RequiredFilePlugin = typeof REQUIRED_FILE_PLUGINS[number]


export interface ILoadedPlugin {
    plugin: string
    version?: string
    user?: string
    time?: string
}


function format_error (error: unknown) {
    return error instanceof Error ? error.message : String(error)
}


class RequiredPluginsModel extends Model<RequiredPluginsModel> {
    visible = false
    checked = false
    checking = false
    loaded_plugins: ILoadedPlugin[] = [ ]
    check_error = ''
    action_plugin = ''
    action = ''
    installing_all = false
    _request_id = 0

    is_loaded (plugin: RequiredFilePlugin) {
        return this.loaded_plugins.some(item => item.plugin === plugin)
    }

    get all_loaded () {
        return REQUIRED_FILE_PLUGINS.every(plugin => this.is_loaded(plugin))
    }

    async refresh (show_error = true) {
        const request_id = ++this._request_id
        this.set({ checking: true, check_error: '' })
        try {
            const loaded_plugins = await model.ddb.invoke<ILoadedPlugin[]>('getLoadedPlugins')
            if (request_id !== this._request_id)
                return false
            this.set({ loaded_plugins, checked: true })
            return true
        } catch (error) {
            if (request_id === this._request_id) {
                this.set({ loaded_plugins: [ ], checked: false, check_error: format_error(error) })
                if (show_error)
                    model.show_error({ title: t('检查插件状态失败'), body: format_error(error) })
            }
            return false
        } finally {
            if (request_id === this._request_id)
                this.set({ checking: false })
        }
    }

    async open (error?: unknown) {
        this.set({ visible: true })
        if (error !== undefined)
            model.show_error({ title: t('相关操作失败'), body: format_error(error) })
        await this.refresh(false)
    }

    close () {
        this.set({ visible: false })
    }

    async ensure_loaded () {
        const checked = await this.refresh()
        if (checked && this.all_loaded)
            return true
        this.set({ visible: true })
        return false
    }

    async _install_and_load (plugin: RequiredFilePlugin) {
        const plugin_path = await model.ddb.invoke<string>('installPlugin', [plugin])
        await model.ddb.invoke<void>('loadPlugin', [plugin_path])
    }

    async load (plugin: RequiredFilePlugin) {
        this.set({ action: 'load', action_plugin: plugin })
        try {
            await model.ddb.invoke<void>('loadPlugin', [plugin])
            model.message.success(t('插件 {{plugin}} 加载成功', { plugin }))
        } catch (error) {
            model.show_error({ title: t('插件操作失败'), body: format_error(error) })
        } finally {
            await this.refresh(false)
            this.set({ action: '', action_plugin: '' })
        }
    }

    async install_missing () {
        const missing_plugins = REQUIRED_FILE_PLUGINS.filter(plugin => !this.is_loaded(plugin))
        const errors: string[] = [ ]
        this.set({ installing_all: true })
        for (const plugin of missing_plugins) {
            this.set({ action: 'install', action_plugin: plugin })
            try {
                await this._install_and_load(plugin)
            } catch (error) {
                errors.push(`${plugin}: ${format_error(error)}`)
            }
        }
        const refreshed = await this.refresh(errors.length === 0)
        this.set({
            installing_all: false,
            action: '',
            action_plugin: '',
        })
        if (errors.length)
            model.show_error({ title: t('插件操作失败'), body: errors.join('\n') })
        else if (refreshed && this.all_loaded)
            model.message.success(t('所需插件已下载并加载'))
    }
}


export const required_plugins_model = new RequiredPluginsModel()
