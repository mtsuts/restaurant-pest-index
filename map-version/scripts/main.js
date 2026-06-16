const stateNameToAbbr = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
  "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
  "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
  "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
  "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
  "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
  "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
}

function buildStateDataFromPestsByStates(rows) {
  if (!rows || !rows.length) return []

  if ('OVERALL RANK' in rows[0] && !('CITY' in rows[0])) {
    return rows
      .map((d) => ({
        STATE: d.STATE?.trim(),
        'OVERALL RANKING': d['OVERALL RANK'],
      }))
      .sort((a, b) => a['OVERALL RANKING'] - b['OVERALL RANKING'])
  }

  const grouped = d3.group(rows, d => d.STATE.trim())
  return Array.from(grouped, ([state, cities]) => ({
    STATE: state,
    'OVERALL RANKING': d3.min(cities, d => d['OVERALL RANK']),
    'RESTAURANT DENSITY RANK': d3.min(cities, d => d['RESTAURANT DENSITY RANK']),
    'HUMIDITY RANK': d3.min(cities, d => d['HUMIDITY RANK']),
    'TRIPADVISOR REVIEWS RANK': d3.min(cities, d => d['TRIPADVISOR REVIEWS RANK']),
  }))
}

function App() {
  let mapJson = null
  let stateMap = null
  let overallMap = null
  let stateData = null
  let citiesData = null
  let stateDropdownChoice = null

  let currentZoom = 1
  let zoomDiff = 0.2
  const scaleExtent = [0.5, 15]


  loadData().then(({ geojson, statesData, pestsData, cities }) => {
    mapJson = geojson
    stateData = statesData
    citiesData = cities

    function cleanKeys(data) {
      return data.map(obj => {
        const cleanedObj = {}
        for (let key in obj) {
          if (obj.hasOwnProperty(key)) {
            const cleanedKey = key.trim()
            cleanedObj[cleanedKey] = obj[key]
          }
        }
        return cleanedObj
      })
    }

    const newPestsData = cleanKeys(pestsData)

    const uniqueStates = [...new Set(stateData.map((d) => d.STATE))]

    const states = (uniqueStates.map((d) => {
      return {
        label: d.trim(),
        value: d.trim()
      }
    }))

    states.push({
      label: `<div class='choice-label'>
        <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.5 5.84467C12.3893 5.84467 8.22498 10.009 8.22498 15.1197C8.22498 19.1447 12.1803 24.2554 14.8053 27.65L14.9803 27.8606C15.575 28.6658 16.5198 29.1211 17.5 29.1211C18.4803 29.1211 19.425 28.6658 20.0198 27.8606C20.1948 27.6158 20.3698 27.4053 20.5803 27.1606C23.2053 23.8 26.775 19.1802 26.775 15.1213C26.775 10.0106 22.6107 5.84467 17.5 5.84467ZM19.8105 26.5643C19.6355 26.809 19.425 27.0538 19.25 27.2643C18.8303 27.8249 18.2 28.1393 17.5 28.1393C16.8 28.1393 16.1697 27.8249 15.75 27.2643L15.575 27.0538C13.0197 23.7643 9.20533 18.7931 9.20533 15.1181C9.20533 10.5681 12.916 6.82342 17.5 6.82342C22.0857 6.82342 25.7946 10.5341 25.7946 15.1181C25.7946 18.8641 22.3304 23.3104 19.8105 26.5643Z" fill="#051C34"/>
          <path d="M17.5 11.1304C15.3303 11.1304 13.5803 12.8804 13.5803 15.05C13.5803 17.2197 15.3303 18.9697 17.5 18.9697C19.6696 18.9697 21.4196 17.2197 21.4196 15.05C21.4196 12.8804 19.6696 11.1304 17.5 11.1304ZM17.5 17.9897C15.8894 17.9897 14.5605 16.6594 14.5605 15.0502C14.5605 13.4397 15.8908 12.1108 17.5 12.1108C19.1105 12.1108 20.4394 13.4411 20.4394 15.0502C20.4394 16.6608 19.1105 17.9897 17.5 17.9897Z" fill="#051C34"/>
        </svg>
        <div>Select State</div>
      </div>`,
      value: 'Select State'
    })

    states.sort((a, b) => {
      const specialLabel = "Select State"

      if (a.label === specialLabel && b.label !== specialLabel) {
        return -1
      }
      if (b.label === specialLabel && a.label !== specialLabel) {
        return 1
      }
      if (a.label < b.label) {
        return -1
      }
      if (a.label > b.label) {
        return 1
      }
      return 0
    })

    const topTenStates = stateData.sort((a, b) => a['OVERALL RANKING'] - b['OVERALL RANKING'])
    const allCitiesTableData = citiesData
      .map(mapCityToTableFormat)
      .sort((a, b) => a['OVERALL RANKING'] - b['OVERALL RANKING'])

    const headers = [
      {
        label: 'Rank',
        icon: './images/icons/rank.svg',
        fieldValue: 'OVERALL RANKING',
        width: '10%'
      },
      {
        label: 'State',
        icon: './images/icons/state.svg',
        fieldValue: 'STATE',
        width: '15%'
      }
    ]

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

    const newMapData = stateData.reduce((obj, d) => {
      obj[d['STATE'].trim()] = d['OVERALL RANKING']
      return obj
    }, {})

    const newSearchMapData = stateData.reduce((obj, d) => {
      obj[d['STATE'].trim()] = d['RESTAURANT DENSITY RANK']
      return obj
    }, {})

    const getTooltipContent = (name, value, target, version, searchValue) => {
      if (!value) return
      const searchRankText = searchValue ? `Restaurant Density Rank: ${ordinal_suffix_of(searchValue)}` : ''
      const nameAndRank = `
         <div class='tooltip-content'>
        <div class="name-and-rank">
          <div class='name'> ${name} </div>
          <div class='rank-value'> #${ordinal_suffix_of(value)} </div> 
        </div>
        ${searchRankText ? `<div class='search-rank'> ${searchRankText} </div>` : ''}
        </div> 
        `

      if (version === "mini") {
        return nameAndRank
      }
      return
    }

    const getCityTooltipContent = (city) => {
      if (!city) return ''

      const overallRank = city['OVERALL RANK'] || ''
      const restaurantRank = city['RESTAURANT DENSITY RANK'] || ''
      const humidityRank = city['HUMIDITY RANK'] || ''
      const cityName = city.CITY || ''

      return `
        <div class='tooltip-content'>
          <div class="name-and-rank">
            <div class='name'>${cityName}</div>
            <div class='rank-value'>#${ordinal_suffix_of(overallRank)}</div>
          </div>
          <div class='search-rank'>Restaurant Density Rank: ${ordinal_suffix_of(restaurantRank)}</div>
          <div class='peak-month'>Humidity Rank: ${ordinal_suffix_of(humidityRank)}</div>
        </div>
      `
    }

    function mapCityToTableFormat(city) {
      return {
        'OVERALL RANKING': city['OVERALL RANK'],
        'CITY': city.CITY,
        'STATE_NAME': city.STATE_NAME || city.STATE,
        'RESTAURANT DENSITY RANK': city['RESTAURANT DENSITY RANK'],
        'HUMIDITY RANK': city['HUMIDITY RANK'],
        'TRIPADVISOR REVIEWS RANK': city['TRIPADVISOR REVIEWS RANK']
      }
    }

    function drawCitiesTable(stateName) {
      const stateAbbrCode = stateNameToAbbr[stateName]
      if (!stateAbbrCode || !citiesData) return

      const citiesInState = citiesData
        .filter(city => city.STATE === stateAbbrCode)
        .map(mapCityToTableFormat)
        .sort((a, b) => a['OVERALL RANKING'] - b['OVERALL RANKING'])

      if (citiesInState.length > 0) {
        drawTable(cityHeaders, citiesInState, `Top Ranking ${stateName} cities`, '798px')
      }
    }

    function initMaps(newMapData, citiesData) {
      overallMap = USMap({
        container: "#overall_map",
        desktopHeight: 450,
        mobileHeight: 200,
        geojson: mapJson,
        data: newMapData,
        searchData: newSearchMapData,
        cities: citiesData,
        colors: ['#E02127', '#CE2531', '#BB2A3C', '#A92E46', '#963250', '#84375B', '#713B65', '#5F3F6F', '#4D447A', '#3A4884', '#284C8E', '#155199', '#0355A3'],
        tooltipContent: ({ name, value, searchValue }, version) => {
          return getTooltipContent(name, value, 'test', version, searchValue)
        },
        cityTooltipContent: (city) => {
          return getCityTooltipContent(city)
        },
        onStateClick: (stateName) => {
          drawCitiesTable(stateName)
        },
        onReset: () => {
          drawTable(cityHeaders, allCitiesTableData, 'Restaurant pest index by city', '798px')
        }
      }).render()
    }

    stateDropdownChoice = initDropdown({
      list: states,
      id: "#categories_select",
      searchPlaceholderValue: 'Search',
      searchEnabled: true,

      cb: (state) => {
        if (state !== 'Select State') {
          if (overallMap && typeof overallMap.selectState === 'function') {
            currentZoom = overallMap.selectState(state) || 1
          }

          const foundStateObject = stateData.find((d) => d['STATE'].trim() === state)
          const foundRank = foundStateObject['OVERALL RANKING']
          const foundSearchRank = foundStateObject['RESTAURANT DENSITY RANK']
          const foundState = foundStateObject['STATE']
          const version = "mini"

          setTimeout(() => {
            const specificPathNode = d3.select(`path[data-state='${state}']`).node()
            if (!specificPathNode) {
              console.error(`Path node for county '${state}' not found.`)
              return
            }

            if (specificPathNode._dropdownTippy) {
              specificPathNode._dropdownTippy.destroy()
              specificPathNode._dropdownTippy = null
            }

            const instance = tippy(specificPathNode, {
              content: getTooltipContent(foundState, foundRank, 'test', version, foundSearchRank),
              allowHTML: true,
              arrow: true,
              theme: 'light',
              animation: 'scale',
              placement: 'top',
              trigger: 'manual'
            })

            instance.show()
            specificPathNode._dropdownTippy = instance
          }, 800)
        }

        if (state === 'Select State') {
          currentZoom = 1
          if (overallMap && typeof overallMap.resetZoom === 'function') {
            overallMap.resetZoom()
          } else {
            drawTable(cityHeaders, allCitiesTableData, 'Restaurant pest index by city', '798px')
          }
        }
      }
    })

    drawTable(cityHeaders, allCitiesTableData, 'Restaurant pest index by city', '798px')
    initMaps(newMapData, citiesData)
    addEvents()
  })

  function loadData() {
    return Promise.all([
      d3.json("./data/map.json"),
      d3.csv('./data/PestsByStates.csv', d3.autoType),
      d3.csv('./data/Pest-by-states.csv', d3.autoType),
      d3.csv('./data/PestsByCity.csv', d3.autoType),
    ]).then(([geojson, pestsByStates, pestsData, pestsByCity]) => {
      const statesData = buildStateDataFromPestsByStates(pestsByStates)
      const cities = pestsByCity.map(city => ({
        ...city,
        STATE_NAME: city.STATE.trim(),
        STATE: stateNameToAbbr[city.STATE.trim()] || city.STATE.trim()
      }))
      return { geojson, statesData, pestsData, cities }
    })
  }

  function addEvents() {
    d3.select(window).on("resize", () => {
      overallMap.resize()
      stateMap.resize()
    })
  }

  function drawTable(headers, data, title, width) {
    d3.select('.table-box').style('width', window.innerWidth < 576 ? '100%' : width)
    d3.select('.table-title').html(title)
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
    const baseData = data.slice()
    let displayedData = baseData.slice()
    let sortState = { field: null, direction: "asc" }
    const nonSortableFields = new Set(['CITY', 'STATE', 'STATE_NAME'])

    const getComparableValue = (row, field) => {
      const value = row[field]
      if (value === null || value === undefined || value === "") return null
      if (typeof value === "number") return value
      const parsed = Number(value)
      if (!Number.isNaN(parsed) && String(value).trim() !== "") return parsed
      return String(value).toLowerCase()
    }

    const sortByHeader = (header) => {
      if (nonSortableFields.has(header.fieldValue)) return

      const isSameField = sortState.field === header.fieldValue
      sortState = {
        field: header.fieldValue,
        direction: isSameField && sortState.direction === "asc" ? "desc" : "asc",
      }

      displayedData = baseData.slice().sort((a, b) => {
        const aVal = getComparableValue(a, header.fieldValue)
        const bVal = getComparableValue(b, header.fieldValue)

        if (aVal === bVal) return 0
        if (aVal === null) return 1
        if (bVal === null) return -1

        let cmp = 0
        if (typeof aVal === "string" || typeof bVal === "string") {
          cmp = String(aVal).localeCompare(String(bVal))
        } else {
          cmp = aVal - bVal
        }

        return sortState.direction === "asc" ? cmp : -cmp
      })

      renderRows(displayedData)
    }

    const renderRows = (rows) => {
      const tableRows = tbody
        .selectAll('.table-body-row')
        .data(rows)
        .join('tr')
        .attr('class', 'table-body-row')

      tableRows
        .selectAll('td')
        .data((d) => {
          return headers.map((header) => d[header.fieldValue])
        })
        .join('td')
        .text((d, index) => {
          return index === 1 || index === 2 ? d : ordinal_suffix_of(d)
        })
    }

    const tableHeader = thead
      .selectAll('.table-header-row')
      .data(['tr'])
      .join('tr')
      .attr('class', 'table-header-row')

    tableHeader.selectAll('th')
      .data(headers)
      .join('th')
      .style('width', (d) => d.width)
      .style('cursor', (d) => nonSortableFields.has(d.fieldValue) ? 'default' : 'pointer')
      .html((d) => `<div class='header-box ${d.label.toLowerCase()}'> 
			  <img src= ${d.icon} class='table-icon' />
				<div class='header-label'> ${d.label} </div>
			</div>`)
      .on('click', (_, header) => sortByHeader(header))

    renderRows(displayedData)
    syncTableHorizontalScroll()
  }

  function syncTableHorizontalScroll() {
    const bodyScroll = document.querySelector('.table-body-scroll')
    const headerScroll = document.querySelector('.table-header-scroll')
    if (!bodyScroll || !headerScroll) return

    bodyScroll.onscroll = () => {
      headerScroll.scrollLeft = bodyScroll.scrollLeft
    }
  }

  d3.select('#zoom_in').on('click', () => {
    if (currentZoom + zoomDiff <= scaleExtent[1]) {
      currentZoom = currentZoom + zoomDiff
    }
    overallMap.zoom(currentZoom)
  })

  d3.select("#zoom_out").on('click', () => {
    currentZoom = 1
    if (overallMap && typeof overallMap.resetZoom === 'function') {
      overallMap.resetZoom()
    }

    if (stateDropdownChoice && typeof stateDropdownChoice.setChoiceByValue === 'function') {
      stateDropdownChoice.setChoiceByValue('Select State')
    } else {
      const selectEl = document.querySelector('#categories_select')
      if (selectEl) {
        selectEl.value = 'Select State'
        if (typeof triggerEvent === 'function') {
          triggerEvent(selectEl, 'change')
        }
      }
    }
  })
}

window.addEventListener("DOMContentLoaded", App)
