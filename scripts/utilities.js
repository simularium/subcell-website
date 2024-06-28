function shadeColor(color, percent) {
    if (color.slice(0,3) == "rgb") {
        let split = color.split(",")
        var R = Number(split[0].split("(")[1])
        var G = Number(split[1])
        var B = Number(split[2].split(")")[0])
    }
    else {
        let f = parseInt(color.slice(1), 16)
        var R = f >> 16
        var G = f >> 8&0x00FF
        var B = f&0x0000FF
    }

    let t = percent < 0 ? 0:255
    let p = percent < 0 ? percent*-1:percent

    let r = (Math.round((t - R)*p)+R)*0x10000
    let g = (Math.round((t - G)*p)+G)*0x100
    let b = (Math.round((t - B)*p)+B)

    return "#" + (0x1000000 + r + g + b).toString(16).slice(1)
}

function linspace(start, end, n) {
    let delta = (end - start)/(n - 1)
    let bins = d3.range(start, end + delta, delta).slice(0, n)
    return bins.map(e => Number((parseFloat(e).toPrecision(12))))
}

function makeHorizontalScale(width, axis) {
    let bounds = axis.bounds.map(e => e)
    let padding = axis.padding ? axis.padding : 0
    bounds[0] = bounds[0] <= bounds[1] ? bounds[0] - padding : bounds[0] + padding
    bounds[1] = bounds[0] <= bounds[1] ? bounds[1] + padding : bounds[1] - padding
    return d3.scaleLinear().range([0, width]).domain(bounds)
}

function makeVerticalScale(width, axis) {
    let bounds = axis.bounds.map(e => e)
    let padding = axis.padding ? axis.padding : 0
    bounds[0] = bounds[0] <= bounds[1] ? bounds[0] - padding : bounds[0] + padding
    bounds[1] = bounds[0] <= bounds[1] ? bounds[1] + padding : bounds[1] - padding
    return d3.scaleLinear().range([width, 0]).domain(bounds)
}

function makeHorizontalTicks(x, y, axis, scale) {
    let bounds = axis.bounds
    let padding = axis.padding ? axis.padding : 0
    let ticks = linspace(bounds[0], bounds[1], axis.n).map(d =>(Math.abs(d) < 10E-10 ? 0 : d))
    let t = []

    if (bounds[0] == bounds[1]) {
        ticks.push(bounds[0])
    }

    for (let i = 0; i < ticks.length; i++) {
        let tx = x + scale(ticks[i])
        let ty = y + 12
        let text = (axis.labels ? axis.labels(ticks[i], i) : ticks[i])

        t.push({
            "tx": tx,
            "ty": ty,
            "y1": y,
            "y2": y + 3,
            "x1": x + scale(ticks[i]),
            "x2": x + scale(ticks[i]),
            "text": text,
        })
    }

    return t
}

function makeVerticalTicks(x, y, axis, scale) {
    let bounds = axis.bounds
    let padding = axis.padding ? axis.padding : 0
    let ticks = linspace(bounds[0], bounds[1], axis.n).map(d => (Math.abs(d) < 10E-10 ? 0 : d))
    let t = []

    if (bounds[0] == bounds[1]) {
        ticks.push(bounds[0])
    }

    for (let i = 0; i < ticks.length; i++) {
        let tx = x - 12
        let ty = y + scale(ticks[i]) + 3
        let text = (axis.labels ? axis.labels(ticks[i], i) : ticks[i])

        t.push({
            "tx": tx,
            "ty": ty,
            "y1": y + scale(ticks[i]),
            "y2": y + scale(ticks[i]),
            "x1": x,
            "x2": x - 3,
            "text": text,
        })
    }

    return t
}

function addTicks(G, ticks) {
    let g = G.selectAll("g").data(ticks).enter().append("g")

    g.selectAll("line")
        .data(d => d).enter().append("line")
            .attr("x1", d => d.x1)
            .attr("x2", d => d.x2)
            .attr("y1", d => d.y1)
            .attr("y2", d => d.y2)
            .attr("stroke", "#fff")

    g.selectAll("text")
        .data(d => d).enter().append("text")
            .html(d => d.text)
            .attr("font-size", "65%")
            .attr("text-anchor", "middle")
            .attr("x", d => d.tx)
            .attr("y", d => d.ty)
            .attr("fill", "#fff")
}

function makeLabel(simulator, velocity, repeat) {
    return `<text y="0" font-weight="bold">${simulator}</text><text y="10" font-size="80%">Velocity = ${velocity}</text><text y="18" font-size="80%">Replicate = ${repeat}</text>`
}
