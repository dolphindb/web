import './RequiredPluginsModal.sass'

import { Alert, Button, Modal, Spin, Tag, Typography } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'

import { t, language } from '@i18n'
import { REQUIRED_FILE_PLUGINS, required_plugins_model } from './model/required-plugins.ts'


const { Link, Text } = Typography

function get_offline_install_doc () {
    return language === 'zh'
        ? 'https://docs.dolphindb.cn/zh/plugins/plg_mkt_inst.html'
        : 'https://docs.dolphindb.com/en/Functions/i/installPlugin.html'
}


export function RequiredPluginsModal () {
    const {
        visible, checked, checking, loaded_plugins, action_plugin, action, installing_all,
    } = required_plugins_model.use([
        'visible', 'checked', 'checking', 'loaded_plugins',
        'action_plugin', 'action', 'installing_all',
    ])
    const all_loaded = checked && REQUIRED_FILE_PLUGINS.every(plugin =>
        loaded_plugins.some(item => item.plugin === plugin)
    )
    const operating = installing_all || Boolean(action_plugin)
    
    return <Modal
        open={visible}
        title={t('AI 文件与知识库插件')}
        width={680}
        onCancel={() => {
            if (!operating)
                required_plugins_model.close()
        }}
        footer={<Button disabled={operating} onClick={() => { required_plugins_model.close() }}>{t('关闭')}</Button>}
        destroyOnHidden
    >
        <div className='ai-required-plugins-modal'>
            <Text type='secondary'>
                {t('AI 对话附件和知识库功能需要加载以下两个插件。')}
            </Text>
            
            {all_loaded && <Alert type='success' showIcon message={t('所需插件均已加载')} />}
            
            <div className='ai-required-plugins-header'>
                <Text strong>{t('当前插件加载情况')}</Text>
                <Button
                    type='text'
                    size='small'
                    icon={<ReloadOutlined />}
                    loading={checking}
                    disabled={operating}
                    onClick={() => { required_plugins_model.refresh() }}
                >{t('刷新')}</Button>
            </div>
            <Spin spinning={checking && !checked}>
                <div className='ai-required-plugin-list'>
                    {REQUIRED_FILE_PLUGINS.map(plugin => {
                        const loaded_plugin = loaded_plugins.find(item => item.plugin === plugin)
                        return <div className='ai-required-plugin-row' key={plugin}>
                            <div>
                                <div className='ai-required-plugin-name'>{plugin}</div>
                                {loaded_plugin?.version && <Text type='secondary'>{t('版本：{{version}}', { version: loaded_plugin.version })}</Text>}
                            </div>
                            <div className='ai-required-plugin-status'>
                                {checked
                                    ? <Tag color={loaded_plugin ? 'success' : 'error'}>{loaded_plugin ? t('已加载') : t('未加载')}</Tag>
                                    : <Tag>{t('未知')}</Tag>}
                                <Button
                                    size='small'
                                    disabled={Boolean(loaded_plugin) || operating}
                                    loading={action === 'load' && action_plugin === plugin}
                                    onClick={() => { required_plugins_model.load(plugin) }}
                                >{t('加载')}</Button>
                            </div>
                        </div>
                    })}
                </div>
            </Spin>
            
            <section className='ai-required-plugin-section'>
                <Text strong>{t('自动下载')}</Text>
                <div className='ai-required-plugin-actions'>
                    <Button
                        type='primary'
                        icon={<DownloadOutlined />}
                        loading={installing_all}
                        disabled={all_loaded || Boolean(action_plugin)}
                        onClick={() => { required_plugins_model.install_missing() }}
                    >{t('下载并加载缺失插件')}</Button>
                </div>
                <Text type='secondary'>
                    {t('如果无法自动下载插件，请')} <Link href={get_offline_install_doc()} target='_blank' rel='noreferrer'>{t('查看手动安装指引')}</Link>
                </Text>
            </section>
        </div>
    </Modal>
}
