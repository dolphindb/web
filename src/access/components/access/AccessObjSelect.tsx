import { Checkbox, Divider, Input, Select, TreeSelect } from 'antd'

import { useMemo } from 'react'

import { t } from '../../../../i18n/index.js'
import { DATABASES_WITHOUT_CATALOG, NEED_INPUT_ACCESS } from '../../constants.js'

import { access } from '../../model.js'
import type { AccessCategory, AccessRule } from '../../types.js'

export function AccessObjSelect ({
    category,
    add_rule_selected,
    set_add_rule_selected
}: {
    category: AccessCategory
    add_rule_selected: AccessRule
    set_add_rule_selected: (access_rule: AccessRule) => void
}) {
    const { catalogs, databases, shared_tables, stream_tables, function_views } = access.use([
        'catalogs',
        'databases',
        'shared_tables',
        'stream_tables',
        'function_views'
    ])
    
    const obj_options = useMemo(() => {
        switch (category) {
            case 'catalog':
                return catalogs.map(cl => cl.name).filter(cl => cl !== DATABASES_WITHOUT_CATALOG)
            case 'database':
                return databases.map(db => db.name)
            case 'shared':
                return shared_tables
            case 'stream':
                return stream_tables
            case 'function_view':
                return function_views
            default:
                return [ ]
        }
    }, [category])
    
    return NEED_INPUT_ACCESS.includes(add_rule_selected.access) ? (
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
    ) : // catalog 且选中 table、schema、db 三类权限 或者 databse 且选中 table 权限需要树状选择器
    (category === 'catalog' &&
          (add_rule_selected.access.startsWith('TABLE') ||
              add_rule_selected.access.startsWith('SCHEMA') ||
              add_rule_selected.access.startsWith('DB'))) ||
      (category === 'database' && add_rule_selected.access.startsWith('TABLE')) ? (
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
            dropdownRender={originNode => {
                let options = [ ]
                if (add_rule_selected.access.startsWith('TABLE') ) 
                    options = catalogs.map(cl => cl.schemas.map(sh => sh.tables)).flat(2)
                else if (add_rule_selected.access.startsWith('DB') )
                    options = catalogs.map(cl => cl.schemas.map(sh => sh.dbUrl)).flat()
                else if (add_rule_selected.access.startsWith('SCHEMA') )
                    options = catalogs.filter(cl => cl.name !== DATABASES_WITHOUT_CATALOG).map(cl => cl.schemas.map(sh => `${cl.name}.${sh.schema}`)).flat()
                
                return  <div>
                <Checkbox
                    className='check-all'
                    checked={options.length && add_rule_selected.obj.length === options.length}
                    indeterminate={
                        add_rule_selected.obj.length > 0 &&
                        add_rule_selected.obj.length < options.length
                    }
                    onChange={e => {
                        if (e.target.checked)
                            set_add_rule_selected({ ...add_rule_selected, obj: options })
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
                          key: cl.name,
                          title: cl.name,
                          value: cl.name,
                          selectable: false,
                          children: cl.schemas.map(sh => ({
                              key: sh.dbUrl,
                              title: sh.schema,
                              // schema 权限 objs 为 catalog.schema,db 权限为 dburl
                              value: add_rule_selected.access.startsWith('DB') ? sh.dbUrl : `${cl.name}.${sh.schema}`,
                              selectable: add_rule_selected.access.startsWith('SCHEMA') || add_rule_selected.access.startsWith('DB'),
                              isLeaf: add_rule_selected.access.startsWith('SCHEMA') || add_rule_selected.access.startsWith('DB'),
                              ...(add_rule_selected.access.startsWith('TABLE')
                                  ? {
                                        children: sh.tables.map(tb => ({
                                            key: `${cl.name}.${sh.schema}.${tb}`,
                                            title: tb,
                                            value: tb,
                                            isLeaf: true
                                        }))
                                    }
                                  : { })
                          }))
                      }))
                    : databases.map(db => ({
                          key: db.name,
                          title: db.name,
                          value: db.name,
                          selectable: false,
                          children: db.tables.map(tb => ({
                              key: `${db.name}.${tb}`,
                              title: tb,
                              value: tb,
                              selectable: true,
                              isLeaf: true
                          }))
                      }))
            }
        />
    ) : (
        <Select
            className='table-select'
            mode='multiple'
            maxTagCount='responsive'
            disabled={category === 'script'}
            placeholder={category === 'script' ? t('应用范围为全局') : t('请选择权限应用范围')}
            value={add_rule_selected.obj}
            dropdownRender={originNode => <div>
                    <Checkbox
                        className='check-all'
                        checked={obj_options.length && add_rule_selected.obj.length === obj_options.length}
                        indeterminate={add_rule_selected.obj.length > 0 && add_rule_selected.obj.length < obj_options.length}
                        onChange={e => {
                            if (e.target.checked)
                                set_add_rule_selected({ ...add_rule_selected, obj: obj_options })
                            else
                                set_add_rule_selected({ ...add_rule_selected, obj: [ ] })
                        }}
                    >
                        {t('全选')}
                    </Checkbox>
                    <Divider className='divider' />
                    {originNode}
                </div>}
            onChange={vals => {
                set_add_rule_selected({ ...add_rule_selected, obj: vals })
            }}
            options={obj_options.map(obj => ({
                key: obj,
                label: obj,
                value: obj
            }))}
        />
    )
}
