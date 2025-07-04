import { Checkbox, Divider, Input, Select, TreeSelect } from 'antd'

import { unique } from 'xshell/utils.browser.js'

import { t } from '@i18n'

import { model } from '@model'
import { to_option } from '@utils'

import { DATABASES_WITHOUT_CATALOG, NEED_INPUT_ACCESS } from '@/access/constants.js'

import type { AccessCategory, AccessRole, AccessRule } from '@/access/types.js'
import { use_access_objs } from '@/access/hooks/use-access-objs.ts'


export function AccessObjSelect ({
    role,
    category,
    add_rule_selected,
    set_add_rule_selected
}: {
    role: AccessRole
    category: AccessCategory
    add_rule_selected: AccessRule
    set_add_rule_selected: (access_rule: AccessRule) => void
}) {
    
    const { data: obj_options } = use_access_objs(role, category)
    
    const { data: catalogs } = use_access_objs(role, 'catalog')
    
    const { data: databases } = use_access_objs(role, 'database')
    
    if (!obj_options || !catalogs || !databases)
        return null
    
    return NEED_INPUT_ACCESS.has(add_rule_selected.access) ?
        <Input
            className='table-select'
            value={add_rule_selected.obj}
            onChange={e => {
                const selected = { ...add_rule_selected }
                selected.obj = [e.target.value]
                set_add_rule_selected(selected)
            }}
            placeholder={
                add_rule_selected.access === 'DB_OWNER'
                    ? t('以 "*" 结尾，表示指定某个 dbName 的前缀范围，例如 "dfs://test0*"')
                    : t('输入限制内存大小，单位为 GB')
            }
        />
    : // catalog 且选中 table、schema、db 三类权限 或者 databse 且选中 table 权限需要树状选择器
        (category === 'catalog' &&
            (add_rule_selected.access.startsWith('TABLE') ||
                add_rule_selected.access.startsWith('SCHEMA') ||
                add_rule_selected.access.startsWith('DB'))) ||
        (category === 'database' && add_rule_selected.access.startsWith('TABLE')) ?
            <TreeSelect
                className='table-select'
                multiple
                maxTagCount='responsive'
                placeholder={t('请选择权限应用范围')}
                treeDefaultExpandAll
                value={add_rule_selected.obj}
                onChange={vals => {
                    const selected = { ...add_rule_selected }
                    selected.obj = vals
                    set_add_rule_selected(selected)
                }}
                popupRender={originNode => {
                    let options = obj_options
            
                    if (add_rule_selected.access.startsWith('TABLE') ) 
                        options = catalogs.map(cl => cl.schemas.map(sh => sh.tables)).flat(2)
                    else if (add_rule_selected.access.startsWith('DB') )
                        options = catalogs.map(cl => cl.schemas.map(sh => sh.dbUrl)).flat()
                    else if (add_rule_selected.access.startsWith('SCHEMA') )
                        options = catalogs.filter(cl => cl.name !== DATABASES_WITHOUT_CATALOG).map(cl => cl.schemas.map(sh => `${cl.name}.${sh.schema}`)).flat()
                    
                    if (model.v2)
                        options = databases.map(db => db.tables).flat()
                    
                    options = unique(options.filter(Boolean))
                    
                    return <div>
                        <Checkbox
                            className='check-all'
                            checked={options.length && add_rule_selected.obj.length === options.length}
                            indeterminate={
                                add_rule_selected.obj.length > 0 &&
                                add_rule_selected.obj.length < options.length
                            }
                            onChange={e => {
                                if (e.target.checked)
                                    set_add_rule_selected({ ...add_rule_selected, obj: typeof options[0] === 'string' ? options : options.map(obj => obj.name) })
                                else
                                    set_add_rule_selected({ ...add_rule_selected, obj: [ ] })
                            }}
                        >
                            {t('全选')}
                        </Checkbox>
                        <Divider className='divider' />
                        {originNode}
                    </div>
                }}
                treeData={
                    category === 'catalog'
                        ? (add_rule_selected.access.startsWith('SCHEMA')
                            ? catalogs.filter(({ name: catalog_name }) => catalog_name !== DATABASES_WITHOUT_CATALOG)
                            : catalogs
                        ).map(cl => ({
                            title: cl.name,
                            value: cl.name,
                            selectable: false,
                            children: cl.schemas.filter(sh => sh.dbUrl).map(sh => ({
                                title: sh.schema,
                                // schema 权限 objs 为 catalog.schema,db 权限为 dburl
                                value: add_rule_selected.access.startsWith('DB') ? sh.dbUrl : `${cl.name}.${sh.schema}`,
                                selectable: add_rule_selected.access.startsWith('SCHEMA') || add_rule_selected.access.startsWith('DB'),
                                isLeaf: add_rule_selected.access.startsWith('SCHEMA') || add_rule_selected.access.startsWith('DB'),
                                ...(add_rule_selected.access.startsWith('TABLE')
                                    ? {
                                            children: sh.tables.map(tb => ({
                                                title: tb,
                                                value: tb,
                                                isLeaf: true
                                            }))
                                        }
                                    : { })
                            }))
                        }))
                        : databases.map(db => ({
                            title: db.name,
                            value: db.name,
                            selectable: false,
                            children: db.tables.map(tb => ({
                                title: tb,
                                value: tb,
                                selectable: true,
                                isLeaf: true
                            }))
                        }))
                }
            />
        :
            <Select
                className='table-select'
                mode='multiple'
                maxTagCount='responsive'
                disabled={category === 'script'}
                placeholder={category === 'script' ? t('应用范围为全局') : t('请选择权限应用范围')}
                value={add_rule_selected.obj}
                popupRender={origin_node =>
                    <div>
                        <Checkbox
                            className='check-all'
                            checked={obj_options.length && add_rule_selected.obj.length === obj_options.length}
                            indeterminate={add_rule_selected.obj.length > 0 && add_rule_selected.obj.length < obj_options.length}
                            onChange={e => {
                                if (e.target.checked)
                                    set_add_rule_selected({ 
                                        ...add_rule_selected, 
                                        obj: typeof obj_options[0] === 'string' 
                                                ? obj_options 
                                                : obj_options
                                                    .map(obj => obj.name)
                                                    .filter(name => name !== DATABASES_WITHOUT_CATALOG) })
                                else
                                    set_add_rule_selected({ ...add_rule_selected, obj: [ ] })
                            }}
                        >
                            {t('全选')}
                        </Checkbox>
                        <Divider className='divider' />
                        {origin_node}
                    </div>
                }
                onChange={vals => {
                    set_add_rule_selected({ ...add_rule_selected, obj: vals })
                }}
                // 如果是 catalog 且选中 catalog 权限，则 options 为 catalog 的 name
                options={
                    (
                        category === 'catalog' && add_rule_selected.access.startsWith('CATALOG') ? 
                            obj_options.map(obj => obj.name).filter(name => name !== DATABASES_WITHOUT_CATALOG)
                        :
                            obj_options
                    ).map((obj: string | any) => to_option(typeof obj === 'string' ? obj : obj.name))
                }
            />
}
