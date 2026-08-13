(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  function svgElement(name, attributes = {}, text = "") {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== "") element.textContent = text;
    return element;
  }

  function finiteValues(series) {
    return series.flatMap((line) => line.values).filter((value) => Number.isFinite(value));
  }

  function paddedDomain(values, includeZero = true) {
    let minimum = Math.min(...values);
    let maximum = Math.max(...values);
    if (minimum === maximum) {
      const padding = Math.max(Math.abs(minimum) * 0.08, 1);
      minimum -= padding;
      maximum += padding;
    } else {
      const padding = (maximum - minimum) * 0.1;
      minimum -= padding;
      maximum += padding;
    }
    if (includeZero) {
      minimum = 0;
      maximum = Math.max(maximum, 1);
    }
    return { minimum, maximum };
  }

  function createAccessibleTable(model) {
    const table = document.createElement("table");
    table.className = "chart-data-table sr-only";
    const caption = document.createElement("caption");
    caption.textContent = model.dataTableLabel;
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const dateHeading = document.createElement("th");
    dateHeading.scope = "col";
    dateHeading.textContent = model.dateLabel;
    headRow.append(dateHeading);
    model.series.forEach((line) => {
      const heading = document.createElement("th");
      heading.scope = "col";
      heading.textContent = line.name;
      headRow.append(heading);
    });
    head.append(headRow);

    const body = document.createElement("tbody");
    model.dates.forEach((date, index) => {
      const row = document.createElement("tr");
      const dateCell = document.createElement("th");
      dateCell.scope = "row";
      dateCell.textContent = model.formatDate(date);
      row.append(dateCell);
      model.series.forEach((line) => {
        const cell = document.createElement("td");
        const value = line.values[index];
        cell.textContent = Number.isFinite(value) ? model.formatValue(value) : "—";
        row.append(cell);
      });
      body.append(row);
    });
    table.append(caption, head, body);
    return table;
  }

  function renderLineChart(container, model) {
    container.replaceChildren();
    container.classList.add("progress-chart");

    const heading = document.createElement("header");
    heading.className = "chart-heading";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = model.title;
    const subtitle = document.createElement("p");
    subtitle.textContent = model.subtitle;
    titleWrap.append(title, subtitle);

    const legend = document.createElement("div");
    legend.className = "chart-legend";
    legend.setAttribute("aria-label", model.legendLabel || "Legend");
    model.series.forEach((line) => {
      const item = document.createElement("span");
      const swatch = document.createElement("i");
      swatch.style.setProperty("--series-color", line.color);
      swatch.setAttribute("aria-hidden", "true");
      item.append(swatch, document.createTextNode(line.name));
      legend.append(item);
    });
    heading.append(titleWrap, legend);
    container.append(heading);

    if (!model.dates.length || !finiteValues(model.series).length) {
      const empty = document.createElement("div");
      empty.className = "chart-empty";
      empty.textContent = model.emptyText;
      container.append(empty);
      return;
    }

    const values = finiteValues(model.series);
    const calculatedDomain = paddedDomain(values, model.includeZero !== false);
    const minimum = Number.isFinite(model.domain?.minimum)
      ? model.domain.minimum
      : calculatedDomain.minimum;
    const maximum = Number.isFinite(model.domain?.maximum)
      ? model.domain.maximum
      : calculatedDomain.maximum;
    const chartWidth = Math.max(680, model.dates.length * 70 + 120);
    const chartHeight = 330;
    const margins = { top: 24, right: 30, bottom: 72, left: 76 };
    const innerWidth = chartWidth - margins.left - margins.right;
    const innerHeight = chartHeight - margins.top - margins.bottom;
    const x = (index) =>
      model.dates.length === 1
        ? margins.left + innerWidth / 2
        : margins.left + (index / (model.dates.length - 1)) * innerWidth;
    const y = (value) =>
      margins.top + ((maximum - value) / Math.max(maximum - minimum, 1)) * innerHeight;

    const scroller = document.createElement("div");
    scroller.className = "chart-scroller";
    scroller.tabIndex = 0;
    const accessibleId = model.instanceId || model.id;
    const svg = svgElement("svg", {
      viewBox: `0 0 ${chartWidth} ${chartHeight}`,
      width: chartWidth,
      height: chartHeight,
      role: "img",
      "aria-labelledby": `${accessibleId}-svg-title ${accessibleId}-svg-desc`,
    });
    svg.append(
      svgElement("title", { id: `${accessibleId}-svg-title` }, model.title),
      svgElement("desc", { id: `${accessibleId}-svg-desc` }, model.subtitle),
    );

    const tickCount = 5;
    const tickValues = Array.isArray(model.tickValues) && model.tickValues.length
      ? model.tickValues.filter((value) => Number.isFinite(value))
      : Array.from(
          { length: tickCount + 1 },
          (_, tick) => minimum + ((maximum - minimum) * tick) / tickCount,
        );
    for (const value of tickValues) {
      const yPosition = y(value);
      svg.append(
        svgElement("line", {
          x1: margins.left,
          x2: chartWidth - margins.right,
          y1: yPosition,
          y2: yPosition,
          class: "chart-grid-line",
        }),
        svgElement(
          "text",
          {
            x: margins.left - 12,
            y: yPosition + 4,
            class: "chart-axis-text chart-y-tick",
            "text-anchor": "end",
          },
          model.formatTick(value),
        ),
      );
    }

    const labelStep = Math.max(1, Math.ceil(model.dates.length / 12));
    model.dates.forEach((date, index) => {
      if (index % labelStep !== 0 && index !== model.dates.length - 1) return;
      svg.append(
        svgElement(
          "text",
          {
            x: x(index),
            y: chartHeight - margins.bottom + 27,
            class: "chart-axis-text chart-x-tick",
            "text-anchor": "end",
            transform: `rotate(-35 ${x(index)} ${chartHeight - margins.bottom + 27})`,
          },
          model.formatDateShort(date),
        ),
      );
    });

    svg.append(
      svgElement(
        "text",
        {
          x: 18,
          y: margins.top + innerHeight / 2,
          class: "chart-axis-title",
          "text-anchor": "middle",
          transform: `rotate(-90 18 ${margins.top + innerHeight / 2})`,
        },
        model.yLabel,
      ),
    );

    model.series.forEach((line) => {
      const points = line.values
        .map((value, index) => (Number.isFinite(value) ? `${x(index)},${y(value)}` : null))
        .filter(Boolean)
        .join(" ");
      if (!points) return;
      svg.append(
        svgElement("polyline", {
          points,
          fill: "none",
          stroke: line.color,
          ...(line.dash ? { "stroke-dasharray": line.dash } : {}),
          "stroke-width": line.emphasis ? 4 : 3,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          class: "chart-series-line",
        }),
      );
      line.values.forEach((value, index) => {
        if (!Number.isFinite(value)) return;
        const circle = svgElement("circle", {
          cx: x(index),
          cy: y(value),
          r: line.emphasis ? 5 : 4,
          fill: "white",
          stroke: line.color,
          "stroke-width": 3,
          class: "chart-point",
          tabindex: "0",
          role: "graphics-symbol",
          "aria-label": `${line.name}, ${model.formatDate(model.dates[index])}: ${model.formatValue(value)}`,
        });
        circle.append(
          svgElement(
            "title",
            {},
            `${line.name} · ${model.formatDate(model.dates[index])} · ${model.formatValue(value)}`,
          ),
        );
        svg.append(circle);
      });
    });

    scroller.append(svg);
    container.append(scroller, createAccessibleTable(model));
  }

  window.HealthCharts = Object.freeze({ renderLineChart });
})();
