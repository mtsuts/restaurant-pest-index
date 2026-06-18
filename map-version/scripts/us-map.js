function USMap(params) {
  var attrs = Object.assign(
    {
      id: Math.floor(Math.random() * 10000000),
      width: window.innerWidth,
      height: window.innerHeight,
      margin: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      },
      data: {},
      searchData: {},
      geojson: null,
      hideClickTooltip: false,
      container: document.body,
      smallStates: [
        "Delaware",
        "Vermont",
        "New Hampshire",
        "Massachusetts",
        "New Jersey",
        "Maryland",
        "Rhode Island",
        "Connecticut",
        "District of Columbia",
      ],
      colors: [],
      cities: [],
      hideLabels: true,
      onStateMouseOver: () => { },
      onStateMouseOut: () => { },
      onStateClick: () => { },
      onReset: () => { },
      tooltipContent: () => { },
      cityTooltipContent: () => { },
    },
    params
  )


  var container,
    svg,
    chart,
    chartInner,
    mapContainer,
    labelsContainer,
    stateLabels,
    stateLabelsClone,
    stateFeatures,
    states,
    chartWidth,
    chartHeight,
    path,
    projection,
    colorScale,
    currentSelected = null,
    circlesShown = false,
    stateHoverEnabled = true,
    zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed),
    stateNameToAbbr = {
      "Alabama": "AL",
      "Alaska": "AK",
      "Arizona": "AZ",
      "Arkansas": "AR",
      "California": "CA",
      "Colorado": "CO",
      "Connecticut": "CT",
      "Delaware": "DE",
      "District of Columbia": "DC",
      "Florida": "FL",
      "Georgia": "GA",
      "Hawaii": "HI",
      "Idaho": "ID",
      "Illinois": "IL",
      "Indiana": "IN",
      "Iowa": "IA",
      "Kansas": "KS",
      "Kentucky": "KY",
      "Louisiana": "LA",
      "Maine": "ME",
      "Maryland": "MD",
      "Massachusetts": "MA",
      "Michigan": "MI",
      "Minnesota": "MN",
      "Mississippi": "MS",
      "Missouri": "MO",
      "Montana": "MT",
      "Nebraska": "NE",
      "Nevada": "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      "Ohio": "OH",
      "Oklahoma": "OK",
      "Oregon": "OR",
      "Pennsylvania": "PA",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      "Tennessee": "TN",
      "Texas": "TX",
      "Utah": "UT",
      "Vermont": "VT",
      "Virginia": "VA",
      "Washington": "WA",
      "West Virginia": "WV",
      "Wisconsin": "WI",
      "Wyoming": "WY"
    }

  function isMobileView() {
    return window.innerWidth < 576
  }

  function getMaxZoom() {
    return isMobileView() ? 16 : 8
  }

  function getStateZoomFit() {
    return isMobileView() ? 1.2 : 0.9
  }

  function getCircleBaseRadius() {
    return isMobileView() ? 26 : 15
  }

  function getCircleRadius(scaleK) {
    return getCircleBaseRadius() / (scaleK || 1)
  }

  function main() {
    if (!attrs.container || !document.querySelector(attrs.container)) {
      return console.error("Please provide a container element!")
    }

    container = d3.select(attrs.container)

    setDimensions()

    // convert topoJSON to geoJSON features
    states = topojson.feature(attrs.geojson, attrs.geojson.objects.states)

    projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305])


    // state path generator
    path = d3.geoPath()

    setColorScale()

    //Add svg
    svg = container
      .patternify({
        tag: "svg",
        selector: "chart-svg",
      })
      .attr("viewBox", "0 0 975 710")
      .attr("width", attrs.width)
      .attr("height", attrs.height)
      .call(zoom)
      .on("wheel.zoom", null)
      .on("dblclick.zoom", null)

    //Add chart group
    chart = svg
      .patternify({
        tag: "g",
        selector: "chart",
      })
      .attr(
        "transform",
        `translate(${attrs.margin.left}, ${attrs.margin.top})`
      )

    //Add chart inner group
    chartInner = chart.patternify({
      tag: "g",
      selector: "chart-inner",
    })

    //Add map container
    mapContainer = chartInner.patternify({
      tag: "g",
      selector: "map-container",
    })

    //Add group for state codes
    labelsContainer = chartInner.patternify({
      tag: "g",
      selector: "state-labels",
    })

    drawStates()
  }

  function drawStates() {
    //Render states
    stateFeatures = mapContainer
      .patternify({
        tag: "path",
        selector: "state",
        data: states.features,
      })
      .attr("data-state", d => d.properties.name)
      .classed("highlighted", (d) => d.properties.name === currentSelected)
      .attr("stroke", "#fff")
      .attr('cursor', 'pointer')
      .attr("stroke-width", 1.5)
      .attr("cursor", 'pointer')
      .attr("fill", (d, i) => {
        var value = attrs.data[d.properties.name]

        if (value) {
          if (isNaN(value)) {
            return "#ccc"
          }
          return colorScale(value)
        }

        return "#ddd"
      })
      .attr("d", path)
      .on("mouseover", function (e, d) {
        if (!stateHoverEnabled) return
        var value = attrs.data[d.properties.name]
        if (!value) return
        if (currentSelected !== d.properties.name || attrs.hideClickTooltip) {
          attrs.onStateMouseOver(d.properties)
          highlight(d.properties.name)
        }
      })
      .on("mouseout", function (e, d) {
        if (!stateHoverEnabled) return
        if (currentSelected !== d.properties.name || attrs.hideClickTooltip) {
          attrs.onStateMouseOut(d.properties)
          highlight(null)
        }
      })
      .on("click", function (e, d) {
        if (e.target?.classList?.contains('city-circle')) {
          return
        }

        const clickedStateName = d.properties.name

        // If clicking the same state that's already selected, hide circles and reset
        if (currentSelected === clickedStateName && circlesShown) {
          // Hide circles and reset zoom to identity
          drawCityCircles([])
          circlesShown = false
          currentSelected = null
          highlight(null)
          resetZoom()
        } else {
          // Show circles for the clicked state
          stateHoverEnabled = false
          highlight(clickedStateName, true)
          zoomToState(d)
          if (attrs.cities && attrs.cities.length) {
            drawCitiesForState(d)
            circlesShown = true
          }
        }
        e.stopPropagation()
      })

    stateLabels = labelsContainer
      .patternify({
        tag: "text",
        selector: "state-label",
        data: states.features,
      })
      .attr("x", (d) => {
        return path.centroid(d)[0]
      })
      .attr("y", (d) => {
        return path.centroid(d)[1]
      })
      .attr("dy", "0.35em")
      .attr("font-size", getLabelSize())
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .attr("user-select", "none")
      .text((d) => {
        return d.properties.name
      })
      .attr("opacity", (d) => {
        if (attrs.hideLabels) {
          return 0
        }

        if (attrs.smallStates.indexOf(d.properties.name) > -1) {
          return 0
        }
        return 1
      })

    stateLabelsClone = stateLabels
      .clone()
      .text((d) => {
        return d.properties.name
      })
      .attr("class", "state-label-clone")

    appendTooltips()
  }

  function appendTooltips() {
    tippy.hideAll()

    const tooltipOptions = {
      allowHTML: true,
      arrow: false,
      maxWidth: 250,
      duration: 0,
      placement: "top",
      popperOptions: {
        modifiers: [
          {
            name: "computeStyles",
            options: {
              gpuAcceleration: false,
            },
          },
        ],
      },
      theme: "light",
      trigger: "manual",
      hideOnClick: true,
    }

    stateLabels.each(function (d) {
      if (this._tippy) {
        this._tippy.destroy()
      }
      const content = attrs.tooltipContent(
        {
          name: d.properties.name,
          value: attrs.data[d.properties.name],
          searchValue: attrs.searchData[d.properties.name]
        },
        "mini"
      )

      if (content) {
        tippy(this, {
          ...tooltipOptions,
          content,
        })
      }
    })

    if (!attrs.hideClickTooltip) {
      stateLabelsClone.each(function (d) {
        if (this._tippy) {
          this._tippy.destroy()
        }

        const content = attrs.tooltipContent(
          {
            name: d.properties.name,
            value: attrs.data[d.properties.name],
            searchValue: attrs.searchData[d.properties.name]
          },
          "navigation"
        )

        if (content) {
          tippy(this, {
            ...tooltipOptions,
            content,
            maxWidth: 350,
            interactive: true,
            offset: [0, 6],
            appendTo: container.node(),
            onHide: (e) => {
              currentSelected = null
              highlight(null)
            }
          })
        }
      })
    }
  }

  function highlight(stateName, clicked) {
    let selection = stateLabels

    stateLabels.each(function () {
      this._tippy && this._tippy.hide()
    })

    if (
      clicked
    ) {
      currentSelected = stateName
      selection = stateLabelsClone

      stateLabelsClone.each(function () {
        this._tippy && this._tippy.hide()
      })

      if (stateName) {
        attrs.onStateClick(stateName)
      }
    }

    // Clear currentSelected if stateName is null
    if (!stateName) {
      currentSelected = null
    }

    if (stateName) {
      if (clicked && attrs.hideClickTooltip) {

      } else {
        selection
          .filter((d) => d.properties.name === stateName)
          .each(function (d) {
            if (this._tippy) {
              this._tippy.show()
            }
          })
      }
    }

    // add highlighted class to path element
    stateFeatures.classed(
      "highlighted",
      (d) =>
        d.properties.name === stateName || d.properties.name === currentSelected
    )
  }

  function getLabelSize() {
    var font = 12

    if (window.innerWidth < 576) {
      font = 19
    } else if (window.innerWidth < 768) {
      font = 15
    }

    return font + "px"
  }

  function setDimensions() {
    var containerRect = container.node().getBoundingClientRect()

    if (containerRect.width > 0) {
      attrs.width = containerRect.width
    }

    if (window.innerWidth < 576) {
      attrs.height = attrs.mobileHeight
    } else {
      attrs.height = attrs.desktopHeight
    }

    zoom.scaleExtent([1, getMaxZoom()])

    chartWidth = attrs.width - attrs.margin.right - attrs.margin.left
    chartHeight = attrs.height - attrs.margin.bottom - attrs.margin.top
  }


  function setColorScale() {
    const [min, max] = d3.extent(Object.values(attrs.data))

    // color linear scale
    colorScale = d3.scaleQuantile().domain([min, max]).range(attrs.colors)
  }

  function zoomToState(feature) {
    if (!feature || !path) return

    // Get the bounding box of the clicked state in SVG coordinates
    const bounds = path.bounds(feature)
    const dx = bounds[1][0] - bounds[0][0]
    const dy = bounds[1][1] - bounds[0][1]
    const x = (bounds[0][0] + bounds[1][0]) / 2
    const y = (bounds[0][1] + bounds[1][1]) / 2

    // Compute scale and translation to fit the state nicely
    const scale = Math.max(
      1,
      Math.min(
        getMaxZoom(),
        getStateZoomFit() / Math.max(dx / chartWidth, dy / chartHeight)
      )
    )

    const translateX = chartWidth / 2 - scale * x
    const translateY = chartHeight / 2 - scale * y

    svg
      .transition()
      .duration(750)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      )

    return scale
  }

  function showCityTooltip(activeNode) {
    mapContainer.selectAll('.city-circle').each(function () {
      if (this._tippy && this !== activeNode) {
        this._tippy.hide()
      }
    })

    if (activeNode?._tippy) {
      activeNode._tippy.show()
    }
  }

  function handleCityCircleClick(e) {
    e.stopPropagation()

    if (isMobileView()) {
      showCityTooltip(this)
    }
  }

  function drawCityCircles(data) {
    if (!mapContainer || !projection) return

    const getProjectedCoords = (d) => {
      const rawLat = Number(d.LATITUDE)
      const rawLon = Number(d.LONGITUDE)
      if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return null

      // City CSV stores US longitudes as positive values; normalize to west-negative.
      const lon = rawLon > 0 ? -rawLon : rawLon
      const lat = rawLat
      return projection([lon, lat])
    }

    const circles = mapContainer
      .selectAll(".city-circle")
      .data(data, d => `${d.CITY}-${d.STATE}`)

    circles.exit().each(function () {
      if (this._tippy) {
        this._tippy.destroy()
      }
    }).remove()

    const circlesEnter = circles
      .enter()
      .append("circle")
      .attr("class", "city-circle")
      .attr("r", getCircleRadius(1))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)

    const mergedCircles = circlesEnter.merge(circles)
      .attr("fill", '#fff')
      .attr('stroke', '#000')
      .attr("cx", d => {
        const coords = getProjectedCoords(d)
        return coords ? coords[0] : null
      })
      .attr("cy", d => {
        const coords = getProjectedCoords(d)
        return coords ? coords[1] : null
      })
      .attr("opacity", d => {
        const coords = getProjectedCoords(d)
        return coords ? 1 : 0
      })
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .on('click', handleCityCircleClick)

    // Add tooltips to circles
    appendCityTooltips(mergedCircles)
  }

  function appendCityTooltips(circles) {
    const isMobile = isMobileView()
    const tooltipOptions = {
      allowHTML: true,
      arrow: false,
      maxWidth: 250,
      duration: 0,
      placement: "top",
      popperOptions: {
        modifiers: [
          {
            name: "computeStyles",
            options: {
              gpuAcceleration: false,
            },
          },
        ],
      },
      theme: "light",
      trigger: isMobile ? "manual" : "mouseenter focus",
      hideOnClick: false,
      interactive: false,
    }

    circles.each(function (d) {
      if (this._tippy) {
        this._tippy.destroy()
      }

      const content = attrs.cityTooltipContent ?
        attrs.cityTooltipContent(d) :
        getDefaultCityTooltipContent(d)

      if (content) {
        tippy(this, {
          ...tooltipOptions,
          content,
        })
      }
    })
  }

  function getDefaultCityTooltipContent(city) {
    if (!city) return ''

    const overallRank = city['OVERALL RANK'] || ''
    const searchRank = city['RANK FOR GSV'] || ''
    const peakMonth = city['MOST SEARCHED MONTH'] || ''
    const cityName = city.CITY || ''

    // Use ordinal_suffix_of if available globally, otherwise just show the number
    const formatRank = (typeof ordinal_suffix_of !== 'undefined') ?
      (rank) => ordinal_suffix_of(rank) :
      (rank) => rank

    return `
      <div class='tooltip-content'>
        <div class="name-and-rank">
          <div class='name'>${cityName}</div>
          <div class='rank-value'>#${formatRank(overallRank)}</div>
        </div>
        <div class='search-rank'>Search Rank: ${formatRank(searchRank)}</div>
        <div class='peak-month'>Peak Month: ${peakMonth}</div>
      </div>
    `
  }

  function drawCitiesForState(feature) {
    if (!attrs.cities || !attrs.cities.length) return
    if (!feature || !feature.properties || !feature.properties.name) return

    const stateName = feature.properties.name
    const abbr = stateNameToAbbr[stateName]

    if (!abbr) {
      drawCityCircles([])
      return
    }

    const citiesInState = attrs.cities.filter(city => city.STATE === abbr)
    drawCityCircles(citiesInState)
  }

  function getStateFeatureByName(stateName) {
    if (!stateName || !states || !states.features) return null
    return states.features.find(f => f?.properties?.name === stateName) || null
  }

  function selectState(stateName) {
    if (!stateName || stateName === 'Select State') {
      resetZoom()
      return 1
    }

    const feature = getStateFeatureByName(stateName)
    if (!feature) return 1

    stateHoverEnabled = false
    highlight(stateName, true)
    const scale = zoomToState(feature) || 1
    drawCitiesForState(feature)
    circlesShown = true
    return scale
  }

  function zoomed(e) {
    var transform = e.transform
    chartInner.attr("transform", transform)

    // Adjust city circle sizes so they appear smaller when zoomed in
    var k = transform.k || 1
    mapContainer
      .selectAll(".city-circle")
      .attr("r", getCircleRadius(k))
      .attr("stroke-width", 1 / k)
  }

  function resetZoom() {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity)
    // Hide circles and reset selection when zoom is reset
    drawCityCircles([])
    circlesShown = false
    currentSelected = null
    stateHoverEnabled = true
    highlight(null)
    // Call reset callback to update table
    attrs.onReset()
  }

  function scaleOnly(scale) {
    svg
      .transition()
      .duration(300)
      .call(zoom.scaleTo, scale, [chartWidth / 2, chartHeight / 2])
  }

  //////////////////////////////////////////////////////
  ///////////////// instance methods ///////////////////
  //////////////////////////////////////////////////////

  main.zoom = function (scale) {
    scaleOnly(scale)
  }

  main.drawCitiesForState = drawCitiesForState
  main.drawCityCircles = drawCityCircles
  main.resetZoom = resetZoom
  main.highlight = highlight
  main.selectState = selectState
  main.colorScale = () => colorScale
  main.resize = () => main()



  main.getDataArr = () => {
    return Object.entries(attrs.data).sort((a, b) => {
      return a[1] - b[1]
    }).map(d => {
      console.log(d)
      return {
        name: d[0],
        value: d[1]
      }
    })
  }

  main.update = (data, colors) => {
    attrs.colors = colors
    attrs.data = data
    currentSelected = null

    main()
    return main
  }

  main.render = function () {
    main()
    return main
  }

  return main

}
