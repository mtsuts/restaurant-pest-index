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
      hideLabels: true,
      onStateMouseOver: () => { },
      onStateMouseOut: () => { },
      onStateClick: () => { },
      tooltipContent: () => { },
    },
    params
  );

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
    zoom = d3.zoom().on("zoom", zoomed);

  function main() {
    if (!attrs.container || !document.querySelector(attrs.container)) {
      return console.error("Please provide a container element!");
    }

    container = d3.select(attrs.container);

    setDimensions();

    // convert topoJSON to geoJSON features
    states = topojson.feature(attrs.geojson, attrs.geojson.objects.states);

    projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);


    // state path generator
    path = d3.geoPath()

    setColorScale();

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
      .on("dblclick.zoom", null);

    //Add chart group
    chart = svg
      .patternify({
        tag: "g",
        selector: "chart",
      })
      .attr(
        "transform",
        `translate(${attrs.margin.left}, ${attrs.margin.top})`
      );

    //Add chart inner group
    chartInner = chart.patternify({
      tag: "g",
      selector: "chart-inner",
    });

    //Add map container
    mapContainer = chartInner.patternify({
      tag: "g",
      selector: "map-container",
    });

    //Add group for state codes
    labelsContainer = chartInner.patternify({
      tag: "g",
      selector: "state-labels",
    });

    drawStates();
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
      .attr("stroke-width", 1.5)
      .attr("fill", (d, i) => {
        var value = attrs.data[d.properties.name];

        if (value) {
          if (isNaN(value)) {
            return "#ccc";
          }
          return colorScale(value);
        }

        return "#ddd";
      })
      .attr("d", path)
      .on("mouseover", function (e, d) {
        if (currentSelected !== d.properties.name || attrs.hideClickTooltip) {
          attrs.onStateMouseOver(d.properties);
          highlight(d.properties.name);
        }
      })
      .on("mouseout", function (e, d) {
        if (currentSelected !== d.properties.name || attrs.hideClickTooltip) {
          attrs.onStateMouseOut(d.properties);
          highlight(null);
        }
      })
      .on("click", function (e, d) {
        highlight(d.properties.name, true);
      });

    stateLabels = labelsContainer
      .patternify({
        tag: "text",
        selector: "state-label",
        data: states.features,
      })
      .attr("x", (d) => {
        return path.centroid(d)[0];
      })
      .attr("y", (d) => {
        return path.centroid(d)[1];
      })
      .attr("dy", "0.35em")
      .attr("font-size", getLabelSize())
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .attr("user-select", "none")
      .text((d) => {
        return d.properties.name;
      })
      .attr("opacity", (d) => {
        if (attrs.hideLabels) {
          return 0;
        }

        if (attrs.smallStates.indexOf(d.properties.name) > -1) {
          return 0;
        }
        return 1;
      });

    stateLabelsClone = stateLabels
      .clone()
      .text((d) => {
        return d.properties.name;
      })
      .attr("class", "state-label-clone");

    appendTooltips();
  }

  function appendTooltips() {
    tippy.hideAll();

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
    };

    stateLabels.each(function (d) {
      if (this._tippy) {
        this._tippy.destroy();
      }
      const content = attrs.tooltipContent(
        {
          name: d.properties.name,
          value: attrs.data[d.properties.name],
        },
        "mini"
      );

      if (content) {
        tippy(this, {
          ...tooltipOptions,
          content,
        });
      }
    });

    if (!attrs.hideClickTooltip) {
      stateLabelsClone.each(function (d) {
        if (this._tippy) {
          this._tippy.destroy();
        }

        const content = attrs.tooltipContent(
          {
            name: d.properties.name,
            value: attrs.data[d.properties.name],
          },
          "navigation"
        );

        if (content) {
          tippy(this, {
            ...tooltipOptions,
            content,
            maxWidth: 350,
            interactive: true,
            offset: [0, 6],
            appendTo: container.node(),
            onHide: (e) => {
              currentSelected = null;
              highlight(null);
            }
          });
        }
      });
    }
  }

  function highlight(stateName, clicked) {
    let selection = stateLabels;

    stateLabels.each(function () {
      this._tippy && this._tippy.hide();
    });

    if (
      clicked
    ) {
      currentSelected = stateName;
      selection = stateLabelsClone;

      stateLabelsClone.each(function () {
        this._tippy && this._tippy.hide();
      });

      attrs.onStateClick(stateName);
    }

    if (stateName) {
      if (clicked && attrs.hideClickTooltip) {

      } else {
        selection
          .filter((d) => d.properties.name === stateName)
          .each(function (d) {
            if (this._tippy) {
              this._tippy.show();
            }
          });
      }
    }

    // add highlighted class to path element
    stateFeatures.classed(
      "highlighted",
      (d) =>
        d.properties.name === stateName || d.properties.name === currentSelected
    );
  }

  function getLabelSize() {
    var font = 12;

    if (window.innerWidth < 576) {
      font = 19;
    } else if (window.innerWidth < 768) {
      font = 15;
    }

    return font + "px";
  }

  function setDimensions() {
    var containerRect = container.node().getBoundingClientRect();

    if (containerRect.width > 0) {
      attrs.width = containerRect.width;
    }

    if (window.innerWidth < 576) {
      attrs.height = attrs.mobileHeight;
    } else {
      attrs.height = attrs.desktopHeight;
    }

    chartWidth = attrs.width - attrs.margin.right - attrs.margin.left;
    chartHeight = attrs.height - attrs.margin.bottom - attrs.margin.top;
  }



  function setColorScale() {
    const [min, max] = d3.extent(Object.values(attrs.data));

    // color linear scale
    colorScale = d3.scaleQuantile().domain([min, max]).range(attrs.colors);
  }

  function zoomed(e) {
    var transform = e.transform;
    chartInner.attr("transform", transform);
  }

  function resetZoom() {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  }

  function scaleOnly(scale) {
    svg
      .transition()
      .duration(300)
      .call(zoom.scaleTo, scale, [chartWidth / 2, chartHeight / 2]);
  }

  //////////////////////////////////////////////////////
  ///////////////// instance methods ///////////////////
  //////////////////////////////////////////////////////

  main.zoom = function (scale) {
    scaleOnly(scale);
  };

  main.resetZoom = resetZoom;
  main.highlight = highlight;
  main.colorScale = () => colorScale;
  main.resize = () => main();

  main.getDataArr = () => {
    return Object.entries(attrs.data).sort((a, b) => {
      return a[1] - b[1];
    }).map(d => {
      return {
        name: d[0],
        value: d[1]
      }
    })
  };

  main.update = (data, colors) => {
    attrs.colors = colors;
    attrs.data = data;
    currentSelected = null;

    main();
    return main;
  };

  main.render = function () {
    main();
    return main;
  };

  return main;
}
