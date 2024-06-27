function generate_pca_trajectories() {
    const ID = "pca_trajectories"

    const WIDTH = 400

    const HEIGHT = 400

    const MARGIN = {
        "left": 40,
        "right": 5,
        "top": 5,
        "bottom": 40,
    }

    const COLORS = {
        "READDY": "#ca562c",
        "CYTOSIM": "#008080",
    }

    // Create SVG.
    let SVG = d3.select(`#${ID}`).append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .append("g")

    SVG.append("rect")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .attr("fill", "#1e1b25")

    // Calculate size of figure and add offset group.
    let width = WIDTH - MARGIN.left - MARGIN.right
    let height = HEIGHT - MARGIN.top - MARGIN.bottom
    let G = SVG.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)

    let legend = G.append("g").attr("id", `${ID}_legend`)
    d3.xml("img/legend.svg")
        .then(data => {
            d3.select(`#${ID}_legend`).node().append(data.documentElement)
        })

    // Load data.
    let file = `data/actin_comparison_panel_pca_trajectories_data.json`
    d3.json(file)
        .then(data => {
            // Select axes.
            let xaxis = {
                "bounds": [-600, 900],
                "n": 6,
                "padding": 250,
            }
            let yaxis = {
                "bounds": [-200, 500],
                "n": 8,
                "padding": 30,
            }

            // Calculate scaling.
            let xscale = makeHorizontalScale(width, xaxis)
            let yscale = makeVerticalScale(height, yaxis)

            // Convert data into paths.
            let entries = data.map((entry) => {
                let percent = (entry["replicate"] / 4 - 0.5) * 0.5
                return {
                    "x": entry["x"],
                    "y": entry["y"],
                    "stroke": shadeColor(COLORS[entry["simulator"]], percent),
                    "label": `<text y="0" font-weight="bold">${entry["simulator"]}</text><text y="10" font-size="80%">Velocity = ${entry["velocity"]}</text><text y="18" font-size="80%">Replicate = ${entry["replicate"]}</text>`,
                }
            })

            // Convert data into start points.
            let starts = data
                .filter(entry => (entry["replicate"] == 2) && (entry["velocity"] == 4.7))
                .map((entry) => {
                    let percent = (entry["replicate"] / 4 - 0.5) * 0.5
                    return {
                        "cx": entry["x"][0],
                        "cy": entry["y"][0],
                        "stroke": shadeColor(COLORS[entry["simulator"]], percent),
                    }
                })

            // Convert data into end points.
            let ends = data.map((entry) => {
                let percent = (entry["replicate"] / 4 - 0.5) * 0.5
                return {
                    "cx": entry["x"][entry["x"].length - 1],
                    "cy": entry["y"][entry["y"].length - 1],
                    "stroke": shadeColor(COLORS[entry["simulator"]], percent),
                }
            })

            // Add interaction calls.
            SVG
                .on("pointerenter", pointerentered)
                .on("pointermove", pointermoved)
                .on("pointerleave", pointerleft)
                .on("touchstart", event => event.preventDefault())
                .on("click", click)

            // Plot paths.
            let trajectory_paths = G.append("g").selectAll("path").data(entries).enter()
                .append("path")
                .attr("d", function(d) {
                    let makePath = d3.line()
                        .x(m => xscale(m))
                        .y((m,i) => yscale(d.y[i]))
                    return makePath(d.x)
                })
                .attr("fill", d => "none")
                .attr("stroke", d => d.stroke)
                .attr("stroke-width", 1)

            // Plot start diamonds.
            let start_paths = G.append("g").selectAll("path").data(starts).enter()
                .append("path")
                .attr("d", d => `m ${xscale(d.cx)},${yscale(d.cy)} m -2.5,0 l 2.5,-2.5 2.5,2.5 -2.5,2.5 z`)
                .attr("fill", d => d.stroke)
                .attr("stroke", d => "#fff")
                .attr("stroke-width", 0.5)

            // Plot end circles.
            let end_circles = G.append("g").selectAll("circle").data(ends).enter()
                .append("circle")
                .attr("cx", d => xscale(d.cx))
                .attr("cy", d => yscale(d.cy))
                .attr("r", 2)
                .attr("fill", d => d.stroke)
                .attr("stroke", d => "#fff")
                .attr("stroke-width", 0.5)

            // Add border.
            G.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .attr("stroke-width", "1px")

            // Add ticks.
            let ticks = []
            ticks.push(makeVerticalTicks(0, 0, yaxis, yscale))
            ticks.push(makeHorizontalTicks(0, height, xaxis, xscale))
            addTicks(G.append("g"), ticks)

            // Add labels.
            let labels = G.append("g")
            labels.append("text")
                .html(d => 'Principal component 1 <tspan font-weight="normal">(88.3%)</tspan>')
                .attr("font-size", "8pt")
                .attr("font-weight", "bold")
                .attr("font-family", "Helvetica")
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("x", width/2)
                .attr("y", height + 30)
            labels.append("text")
                .html(d => 'Principal component 2 <tspan font-weight="normal">(4.6%)</tspan>')
                .attr("transform", "rotate(-90," + -30 + "," + height / 2 + ")")
                .attr("font-size", "8pt")
                .attr("font-weight", "bold")
                .attr("font-family", "Helvetica")
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("x", -30)
                .attr("y", height / 2)

            let markers = G.append("g")
                .attr("display", "none")

            let text = markers.append("g")
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("font-size", "75%")

            let start_marker = markers.append("path")
                .attr("d", `m 0,0 m -2.5,0 l 2.5,-2.5 2.5,2.5 -2.5,2.5 z`)
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5)

            let end_marker = markers.append("circle")
                .attr("r", 2)
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5)

            const points = entries
                .map((entry, index) => entry.x.map((e, i) => [
                    xscale(e) + MARGIN.left, yscale(entry.y[i]) + MARGIN.top, entry,
                    xscale(entry.x[0]), yscale(entry.y[0]),
                    xscale(entry.x[entry.x.length - 1]), yscale(entry.y[entry.y.length - 1])
                ]))
                .flat()

            // Adapted from: https://observablehq.com/@d3/multi-line-chart/2
            function pointermoved(event) {
                const [xm, ym] = d3.pointer(event)

                const i = d3.leastIndex(points, e => Math.hypot(e[0] - xm, e[1] - ym))
                const [x, y, k, x0, y0, x1, y1, label] = points[i]

                trajectory_paths
                    .style("stroke", (d) => d === k ? d["stroke"] : "#47444D")
                    .filter((d) => d === k).raise()

                start_marker
                    .attr("transform", `translate(${x0},${y0})`)
                    .attr("fill", k["stroke"])

                end_marker
                    .attr("transform", `translate(${x1},${y1})`)
                    .attr("fill", k["stroke"])

                text
                    .attr("transform", `translate(${x},${y - 24})`)
                    .html(k["label"])
            }

            function pointerentered() {
                trajectory_paths.style("stroke", "#47444D")
                start_paths.style("fill", "#47444D")
                end_circles.style("fill", "#47444D")
                markers.attr("display", null)
            }

            function pointerleft() {
                trajectory_paths.style("stroke", null)
                start_paths.style("fill", null)
                end_circles.style("fill", null)
                markers.attr("display", "none")
            }

            function click(d) {
                const [xm, ym] = d3.pointer(event)
                const i = d3.leastIndex(points, e => Math.hypot(e[0] - xm, e[1] - ym))
                const [x, y, k, x0, y0, x1, y1, label] = points[i]
                console.log(k)
            }
        })
        .catch(error => {
            console.log(error)
        })
}

function generate_pca_transform() {
    const ID = "pca_transform"

    const WIDTH = 450

    const HEIGHT = 200

    const MARGIN = {
        "left": 0,
        "right": 0,
        "top": 0,
        "bottom": 0,
    }

    const BOUNDS = {
        "1": [-600, 900, 300],
        "2": [-200, 400, 200],
    }

    const COLORMAP = [
        "#f9ddda",
        "#f2b9c4",
        "#e597b9",
        "#ce78b3",
        "#ad5fad",
        "#834ba0",
        "#573b88",
    ]

    // Clear canvas.
    let node = document.getElementById(ID)
    while (node.firstChild) {
        node.removeChild(node.firstChild)
    }

    // Create SVG.
    let SVG = d3.select(`#${ID}`).append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .append("g")

    SVG.append("rect")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .attr("fill", "#1e1b25")

    // Calculate size of figure and add offset group.
    let width = WIDTH - MARGIN.left - MARGIN.right
    let height = HEIGHT - MARGIN.top - MARGIN.bottom
    let G = SVG.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)

    // Get selected option.
    let projection = document.querySelector("input[name=projection]:checked").id.replace("projection_", "")
    let component = document.querySelector("input[name=component]:checked").id.replace("component_", "")
    let horizontal = projection.split("_")[0].toLowerCase()
    let vertical = projection.split("_")[1].toLowerCase()

    let colormap = d3.scaleLinear()
        .range(COLORMAP)
        .domain(linspace(BOUNDS[component][0], BOUNDS[component][1], COLORMAP.length))

    // Load data.
    let file = `data/actin_comparison_panel_pca_transform_data.json`
    d3.json(file)
        .then(data => {
            // Select axes.
            let xaxis = {
                "bounds": [-270, 270],
                "n": 6,
                "padding": 0,
            }
            let yaxis = {
                "bounds": [-270, 270],
                "padding": 0,
            }

            // Calculate scaling.
            let xscale = makeHorizontalScale(width, xaxis)
            let yscale = makeVerticalScale(height, yaxis)

            // Convert data into paths.
            let entries = data
                .filter(d => d["component"] == component)
                .map((entry) => {
                    let point = entry["point"]
                    return {
                        "x": entry[horizontal],
                        "y": entry[vertical],
                        "stroke": colormap(point),
                    }
                })

            // Plot reference.
            if (projection != "Z_Y") {
                G.append("path")
                .attr("d", `m ${xscale(-260)},${yscale(0)} l ${xscale(230)},0`)
                .attr("stroke", "#555")
                .attr("stroke-dasharray", "2,2")
            }

            // Plot paths.
            G.append("g").selectAll("path").data(entries).enter()
                .append("path")
                .attr("d", function(d) {
                    let makePath = d3.line()
                        .x(m => xscale(m))
                        .y((m,i) => yscale(d.y[i]))
                    return makePath(d.x)
                })
                .attr("fill", d => "none")
                .attr("stroke", d => d.stroke)
                .attr("stroke-width", 1)
        })
        .catch(error => {
            console.log(error)
        })
}
