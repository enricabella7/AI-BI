import './DataMapping.css'

export default function DataMapping({ dataElements, dataSources, mappings, onMap }) {
  if (dataElements.length === 0 && dataSources.length === 0) {
    return (
      <div className="data-mapping">
        <div className="dm-empty">
          <p className="dm-empty-title">No data to map</p>
          <p className="dm-empty-text">
            Use <code>{'{{placeholder}}'}</code> syntax in your code to define data elements, then connect a data source to map them.
          </p>
        </div>
      </div>
    )
  }

  if (dataElements.length === 0) {
    return (
      <div className="data-mapping">
        <div className="dm-empty">
          <p className="dm-empty-title">No placeholders found</p>
          <p className="dm-empty-text">
            Add <code>{'{{placeholder}}'}</code> in your code to create data binding points. Example: <code>{'{{revenue}}'}</code>, <code>{'{{users}}'}</code>
          </p>
        </div>
      </div>
    )
  }

  if (dataSources.length === 0) {
    return (
      <div className="data-mapping">
        <div className="dm-empty">
          <p className="dm-empty-title">No data sources</p>
          <p className="dm-empty-text">
            Found {dataElements.length} placeholder(s) in your code. Connect a data source in the Data Sources tab to map them.
          </p>
          <div className="dm-elements-preview">
            {dataElements.map((el) => (
              <span key={el} className="dm-element-tag">{`{{${el}}}`}</span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="data-mapping">
      <p className="dm-info">
        Map each placeholder in your code to a column from your data sources.
      </p>
      <div className="dm-list">
        {dataElements.map((element) => {
          const mapping = mappings[element]
          return (
            <div key={element} className="dm-row">
              <span className="dm-element">{`{{${element}}}`}</span>
              <span className="dm-arrow">→</span>
              <div className="dm-selectors">
                <select
                  className="dm-select"
                  value={mapping?.sourceId || ''}
                  onChange={(e) => {
                    const sourceId = Number(e.target.value)
                    if (sourceId) {
                      const source = dataSources.find(s => s.id === sourceId)
                      onMap(element, sourceId, source?.columns[0] || '')
                    } else {
                      onMap(element, null, null)
                    }
                  }}
                >
                  <option value="">Select source...</option>
                  {dataSources.map((src) => (
                    <option key={src.id} value={src.id}>{src.name}</option>
                  ))}
                </select>
                {mapping?.sourceId && (
                  <select
                    className="dm-select"
                    value={mapping.column || ''}
                    onChange={(e) => onMap(element, mapping.sourceId, e.target.value)}
                  >
                    {dataSources
                      .find(s => s.id === mapping.sourceId)
                      ?.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                  </select>
                )}
              </div>
              {mapping?.sourceId && mapping?.column && (
                <span className="dm-mapped-badge">Mapped</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
