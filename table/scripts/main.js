function App() {
  loadData().then(({ cities }) => {
    const cityHeaders = [
      {
        label: 'Rank',
        icon: './images/icons/rank.svg',
        fieldValue: 'OVERALL RANKING',
        width: '8%'
      },
      {
        label: 'City',
        icon: './images/icons/city.svg',
        fieldValue: 'CITY',
        width: '13%'
      },
      {
        label: 'State',
        icon: './images/icons/state.svg',
        fieldValue: 'STATE_NAME',
        width: '13%'
      },
      {
        label: 'Restaurants',
        icon: './images/icons/restaurant.svg',
        fieldValue: 'RESTAURANT DENSITY RANK',
        width: '13%'
      },
      {
        label: 'Humidity',
        icon: './images/icons/humidity.svg',
        fieldValue: 'HUMIDITY RANK',
        width: '13%'
      },
      {
        label: 'Negative Reviews',
        icon: './images/icons/negative-reviews.svg',
        fieldValue: 'TRIPADVISOR REVIEWS RANK',
        width: '13%'
      }
    ]

    const allCitiesTableData = cities
      .map(mapCityToTableFormat)
      .sort((a, b) => a['OVERALL RANKING'] - b['OVERALL RANKING'])
      // .slice(0, 10)

    drawTable(cityHeaders, allCitiesTableData)
  })

  function loadData() {
    return d3.csv('./data/PestsByCity.csv', d3.autoType).then((pestsByCity) => {
      const cities = pestsByCity.map(city => ({
        ...city,
        STATE_NAME: city.STATE.trim()
      }))

      return { cities }
    })
  }

  function mapCityToTableFormat(city) {
    return {
      'OVERALL RANKING': city['OVERALL RANK'],
      CITY: city.CITY,
      STATE_NAME: city.STATE_NAME || city.STATE,
      'RESTAURANT DENSITY RANK': city['RESTAURANT DENSITY RANK'],
      'HUMIDITY RANK': city['HUMIDITY RANK'],
      'TRIPADVISOR REVIEWS RANK': city['TRIPADVISOR REVIEWS RANK']
    }
  }

  function drawTable(headers, data) {
    const headerTable = d3.select('#table-header')
    const bodyTable = d3.select('#table-body')

    function syncColgroup(tableSel) {
      const colgroup = tableSel.select('colgroup').empty()
        ? tableSel.append('colgroup')
        : tableSel.select('colgroup')
      colgroup.selectAll('col')
        .data(headers)
        .join('col')
        .style('width', (d) => d.width)
    }

    syncColgroup(headerTable)
    syncColgroup(bodyTable)

    const thead = headerTable.select('thead').empty() ? headerTable.append('thead') : headerTable.select('thead')
    const tbody = bodyTable.select('tbody').empty() ? bodyTable.append('tbody') : bodyTable.select('tbody')
    let currentData = data.slice()
    const sortDirections = {}
    const nonSortableFields = new Set(['CITY', 'STATE', 'STATE_NAME'])

    const tableHeader = thead
      .selectAll('.table-header-row')
      .data(['tr'])
      .join('tr')
      .attr('class', 'table-header-row')

    const headerCells = tableHeader.selectAll('th')
      .data(headers)
      .join('th')
      .style('width', (d) => d.width)
      .html((d) => `<div class='header-box'> 
			  <img src= ${d.icon} class='table-icon' />
				<div class='header-label'> ${d.label} </div>
			</div>`)

    const colors = ['#E02127', '#CE2531', '#BB2A3C', '#A92E46', '#963250', '#84375B', '#713B65', '#5F3F6F', '#4D447A', '#3A4884', '#284C8E', '#155199', '#0355A3']

    function renderBody() {
      const tableRows = tbody
        .selectAll('.table-body-row')
        .data(currentData)
        .join('tr')
        .attr('class', 'table-body-row')

      tableRows
        .selectAll('td')
        .data((d) => headers.map((header) => d[header.fieldValue]))
        .join('td')
        .text((d, index) => {
          const field = headers[index].fieldValue
          return nonSortableFields.has(field) ? d : ordinal_suffix_of(d)
        })

      tbody.selectAll('.table-body-row td:nth-child(1)')
        .style('border-left', function () {
          const rowData = d3.select(this.parentNode).datum()
          const rank = rowData['OVERALL RANKING']
          const colorIndex = Math.min(Math.max(rank - 1, 0), colors.length - 1)
          return `5px ${colors[colorIndex]} solid`
        })
    }

    renderBody()
    syncTableHorizontalScroll()

    headerCells.on('click', (_, header) => {
      const field = header.fieldValue
      if (nonSortableFields.has(field)) return

      const isAsc = sortDirections[field] === true

      currentData = currentData.slice().sort((a, b) => {
        const va = a[field]
        const vb = b[field]

        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1

        let comparison
        if (typeof va === 'number' && typeof vb === 'number') {
          comparison = va - vb
        } else {
          comparison = String(va).localeCompare(String(vb))
        }

        return isAsc ? -comparison : comparison
      })

      sortDirections[field] = !isAsc
      renderBody()
    })
  }

  function syncTableHorizontalScroll() {
    const bodyScroll = document.querySelector('.table-body-scroll')
    const headerScroll = document.querySelector('.table-header-scroll')
    if (!bodyScroll || !headerScroll) return

    bodyScroll.onscroll = () => {
      headerScroll.scrollLeft = bodyScroll.scrollLeft
    }
  }
}

window.addEventListener('DOMContentLoaded', App)
