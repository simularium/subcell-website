function generate_filaments_table() {
    const ID = "filaments_table"

    // Get selected replicate.
    let replicate = document.querySelector("input[name=replicate]:checked").id.replace("replicate_", "")

    let velocities = ["0000", "0047", "0150", "0470", "1500"]

    // Update links and images for monomer-scale simulations.
    velocities.forEach(velocity => d3.select(`#${ID}_monomer_${velocity}`)
        .html(null)
        .append("a")
        .attr("target", "_blank")
        .attr("href", "https://simularium.allencell.org/viewer?trajUrl=https://cytosim-working-bucket.s3.us-west-2.amazonaws.com/simularium/actin_compression_velocity=4.7_0.simularium")
        .append("img")
        .attr("src", `img/actin_compression_matrix_placeholder_replicate_${replicate}.jpg`))

    // Update links and images for fiber-scale simulations.
    velocities.forEach(velocity => d3.select(`#${ID}_fiber_${velocity}`)
        .html(null)
        .append("a")
        .attr("target", "_blank")
        .attr("href", "https://simularium.allencell.org/viewer?trajUrl=https://cytosim-working-bucket.s3.us-west-2.amazonaws.com/simularium/actin_compression_velocity=4.7_0.simularium")
        .append("img")
        .attr("src", `img/actin_compression_matrix_placeholder_replicate_${replicate}.jpg`))
}

function generate_compression_metrics() {
    const ID = "compression_metrics"

    const WIDTH = 500

    const HEIGHT = 300

    const MARGIN = {
        "left": 40,
        "right": 5,
        "top": 5,
        "bottom": 40,
    }

    const COLORS = {
        "readdy": "#ca562c",
        "cytosim": "#008080",
    }

    const LABELS = {
        "non_coplanarity": "Non-coplanarity",
        "peak_asymmetry": "Peak asymmetry",
        "average_perp_distance": "Average perpendicular distance",
        "contour_length": "Contour length",
        "compression_ratio": "Compression ratio",
    }

    // Calculate size of figure .
    let width = WIDTH - MARGIN.left - MARGIN.right
    let height = HEIGHT - MARGIN.top - MARGIN.bottom

    // Select axes.
    let xaxis = {
        "bounds": [0, 1],
        "n": 6,
        "padding": 0.02,
    }
    let yaxis = {
        "peak_asymmetry": {
            "bounds": [0, 0.4],
            "padding": 0.02,
            "n": 5,
        },
        "non_coplanarity": {
            "bounds": [0, 0.04],
            "padding": 0.002,
            "n": 5,
        },
        "compression_ratio": {
            "bounds": [0, 0.4],
            "padding": 0.01,
            "n": 5,
        },
        "average_perp_distance": {
            "bounds": [0, 100],
            "padding": 5,
            "n": 6,
        },
        "contour_length": {
            "bounds": [490, 500],
            "padding": 1,
            "n": 6,
        },
    }

    // Get selected velocity and metric.
    let velocity = document.querySelector("input[name=velocity]:checked").id.replace("velocity_", "")
    let metric = document.querySelector("input[name=metric]:checked").id.replace("metric_", "")

    // Calculate scaling.
    let xscale = makeHorizontalScale(width, xaxis)
    let yscale = makeVerticalScale(height, yaxis[metric])

    // Get or create SVG.
    let SVG = d3.select(`#${ID}`).select("svg")
    let G = SVG.select("g").select("#data")

    if (SVG.empty()) {
        // Create SVG.
        SVG = d3.select(`#${ID}`).append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .append("g")

        // Add background.
        SVG.append("rect")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .attr("fill", "#1e1b25")

        // Add offset group.
        G = SVG.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)

        // Add border.
        G.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-width", "1px")

        // Add labels.
        let labels = G.append("g")
        labels.append("text")
            .html('Normalized time')
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("x", width/2)
            .attr("y", height + 30)

        // Add data group.
        G = G.append("g").attr("id", "data")
    }

    // Clear contents.
    G.html(null)

    // Add ticks.
    let ticks = []
    ticks.push(makeVerticalTicks(0, 0, yaxis[metric], yscale))
    ticks.push(makeHorizontalTicks(0, height, xaxis, xscale))
    addTicks(G.append("g"), ticks)

    // Add labels.
    let labels = G.append("g")
    labels.append("text")
        .html(LABELS[metric])
        .attr("transform", "rotate(-90," + -30 + "," + height / 2 + ")")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("x", -30)
        .attr("y", height / 2)

    // Aggregation function.
    let getTracks = function(entries, metric) {
        return {
            "x": entries.map(e => e["normalized_time"]),
            "y": entries.map(e => e[metric]),
        }
    }

    // Load data.
    let file = `data/actin_compression_combined_metrics.csv`
    d3.csv(file)
        .then(data => {
            // Filter and group data.
            let filtered = data.filter(d => d.key == velocity)
            let grouped = d3.flatRollup(filtered, d => getTracks(d, metric), d => d.simulator, d => d.repeat)

            // Convert data into paths.
            let entries = grouped.map(([simulator, repeat, entry]) => {
                let percent = (repeat / 4 - 0.5) * 0.5
                return {
                    "x": entry["x"],
                    "y": entry["y"],
                    "stroke": shadeColor(COLORS[simulator], percent),
                    "label": makeLabel(simulator, null, repeat),
                }
            })

            // Plot paths.
            let trajectory_paths = G.selectAll("path").data(entries).enter()
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

            // Add interaction markers.
            let markers = G.append("g")
                .attr("display", "none")
            let text = markers.append("g")
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("font-size", "75%")

            // Add interaction calls.
            SVG
                .on("pointerenter", pointerentered)
                .on("pointermove", pointermoved)
                .on("pointerleave", pointerleft)
                .on("touchstart", event => event.preventDefault())

            // Format interaction data.
            const points = entries
                .map((entry, index) => entry.x.map((e, i) => [
                    xscale(e),
                    yscale(entry.y[i]),
                    entry,
                ]))
                .flat()

            function pointermoved(event) {
                const [xm, ym] = d3.pointer(event)

                const i = d3.leastIndex(points, e => Math.hypot(e[0] - xm + MARGIN.left, e[1] - ym + MARGIN.top))
                const [x, y, k] = points[i]

                trajectory_paths
                    .style("stroke", (d) => d === k ? d["stroke"] : "#47444D")
                    .filter((d) => d === k).raise()

                markers.raise()

                text
                    .attr("transform", `translate(${x},${y - 24})`)
                    .html(k["label"])
            }

            function pointerentered() {
                trajectory_paths.style("stroke", "#47444D")
                markers.attr("display", null)
            }

            function pointerleft() {
                trajectory_paths.style("stroke", null)
                markers.attr("display", "none")
            }
        })
        .catch(error => {
            console.log(error)
        })
}

function generate_pca_trajectories_or_features() {
    const ID = "pca_trajectories_or_features"

    const WIDTH = 500

    const HEIGHT = 300

    const MARGIN = {
        "left": 40,
        "right": 5,
        "top": 5,
        "bottom": 40,
    }

    // Calculate size of figure .
    let width = WIDTH - MARGIN.left - MARGIN.right
    let height = HEIGHT - MARGIN.top - MARGIN.bottom

    // Select axes.
    let xaxis = {
        "bounds": [-900, 600],
        "n": 6,
        "padding": 250,
    }
    let yaxis = {
        "bounds": [-500, 200],
        "n": 8,
        "padding": 50,
    }

    // Calculate scaling.
    let xscale = makeHorizontalScale(width, xaxis)
    let yscale = makeVerticalScale(height, yaxis)

    // Get or create SVG.
    let SVG = d3.select(`#${ID}`).select("svg")
    let G = SVG.select("g").select("#data")

    if (SVG.empty()) {
        // Create SVG.
        SVG = d3.select(`#${ID}`).append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .append("g")

        // Add background.
        SVG.append("rect")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .attr("fill", "#1e1b25")

        // Add offset group.
        G = SVG.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)

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
            .html('Principal component 1 <tspan font-weight="normal">(89.3%)</tspan>')
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("x", width/2)
            .attr("y", height + 30)
        labels.append("text")
            .html('Principal component 2 <tspan font-weight="normal">(4.6%)</tspan>')
            .attr("transform", "rotate(-90," + -30 + "," + height / 2 + ")")
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("x", -30)
            .attr("y", height / 2)

        // Add data group.
        G = G.append("g").attr("id", "data")
    }

    // Get selected option.
    let feature = document.querySelector("input[name=feature]:checked").id.replace("feature_", "")

    if (feature == "simulator") {
        generate_pca_trajectories(ID, SVG, G, MARGIN, width, height, xscale, yscale)
    } else (
        generate_pca_feature(ID, SVG, G, MARGIN, width, height, xscale, yscale, feature)
    )
}

function generate_pca_trajectories(ID, SVG, G, MARGIN, width, height, xscale, yscale) {
    const COLORS = {
        "READDY": "#ca562c",
        "CYTOSIM": "#008080",
    }

    // Clear contents.
    G.html(null)

    let legend = G.append("g").attr("id", `${ID}_legend`)
    d3.xml("img/legend.svg")
        .then(data => {
            d3.select(`#${ID}_legend`).node().append(data.documentElement)
        })

    // Load data.
    let file = `data/actin_compression_pca_trajectories.json`
    d3.json(file)
        .then(data => {
            // Convert data into paths.
            let entries = data.map((entry) => {
                let percent = (entry["replicate"] / 4 - 0.5) * 0.5
                return {
                    "x": entry["x"],
                    "y": entry["y"],
                    "stroke": shadeColor(COLORS[entry["simulator"]], percent),
                    "label": makeLabel(entry["simulator"], entry["velocity"], entry["replicate"]),
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

            // Add interaction calls.
            SVG
                .on("pointerenter", pointerentered)
                .on("pointermove", pointermoved)
                .on("pointerleave", pointerleft)
                .on("touchstart", event => event.preventDefault())
                .on("click", click)

            // Add interaction markers.
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

            // Format interaction data.
            const points = entries
                .map((entry, index) => entry.x.map((e, i) => [
                    xscale(e),
                    yscale(entry.y[i]),
                    entry,
                    xscale(entry.x[0]),
                    yscale(entry.y[0]),
                    xscale(entry.x[entry.x.length - 1]),
                    yscale(entry.y[entry.y.length - 1]),
                ]))
                .flat()

            // Adapted from: https://observablehq.com/@d3/multi-line-chart/2
            function pointermoved(event) {
                const [xm, ym] = d3.pointer(event)

                const i = d3.leastIndex(points, e => Math.hypot(e[0] - xm + MARGIN.left, e[1] - ym + MARGIN.top))
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

function generate_pca_feature(ID, SVG, G, MARGIN, width, height, xscale, yscale, feature) {
    const COLORMAP = [
        "#f9ddda",
        "#f2b9c4",
        "#e597b9",
        "#ce78b3",
        "#ad5fad",
        "#834ba0",
        "#573b88",
    ]

    // Set colormap.
    let colormap = null

    if (feature == "compression_ratio") {
        colormap = d3.scaleLinear()
            .range(COLORMAP)
            .domain(linspace(0, 0.3, COLORMAP.length))
    } else if (feature == "velocity") {
        colormap = d3.scaleLinear()
            .range(["#f9ddda", "#e597b9", "#ad5fad", "#573b88"])
            .domain([4.7, 15, 47, 150])
    } else if (feature == "peak_asymmetry") {
        colormap = d3.scaleLinear()
            .range(COLORMAP)
            .domain(linspace(0, 0.1, COLORMAP.length))
    } else if (feature == "non_coplanarity") {
        colormap = d3.scaleLinear()
            .range(COLORMAP)
            .domain(linspace(0, 0.01, COLORMAP.length))
    }

    // Clear contents.
    G.html(null)

    // Load data.
    let file = `data/actin_comparison_panel_pca_features_data.csv`
    file = "data/pca.csv"

    Promise.all([
        d3.csv("data/actin_compression_pca_results.csv"),
        d3.csv("data/actin_compression_combined_metrics.csv"),
    ]).then(data => {
            // Convert data into points.
            let feature_map = d3.map(data[1], e => `${e["simulator"]}_${e["velocity"]}_${e["repeat"]}_${e["time"]}`)
            let x = data[0].map(e => e["PCA1"])
            let y = data[0].map(e => e["PCA2"])
            let s = data[0].map(e => makeLabel(e["SIMULATOR"], e["VELOCITY"], e["REPEAT"]))
            let v = data[0].map(e => feature_map.get(`${e["SIMULATOR"].toLowerCase()}_${e["VELOCITY"]}_${e["REPEAT"]}_${e["TIME"]}`)[feature])
            let c = v.map(e => colormap(e))

            let circles = G.append("g").selectAll("circle")
                .data(function(d) {
                    return x.map(function(e, i) {
                        return {
                            "x": xscale(e),
                            "y": yscale(y[i]),
                            "fill": colormap(v[i]),
                            "label": s[i]
                        }
                    })
                })
                .enter().append("circle")
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y)
                    .attr("r", 1)
                    .attr("fill", d => d.fill)

            // Add interaction markers.
            let markers = G.append("g")
                .attr("display", "none")
            let text = markers.append("g")
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("font-size", "75%")

            // Add interaction calls.
            SVG
                .on("pointerenter", pointerentered)
                .on("pointermove", pointermoved)
                .on("pointerleave", pointerleft)
                .on("touchstart", event => event.preventDefault())

            // Format interaction data.
            const points = data[0]
                .map(e => [
                    xscale(e["PCA1"]),
                    yscale(e["PCA2"]),
                    makeLabel(e["SIMULATOR"], e["VELOCITY"], e["REPEAT"]),
                ])

            // Adapted from: https://observablehq.com/@d3/multi-line-chart/2
            function pointermoved(event) {
                const [xm, ym] = d3.pointer(event)

                const i = d3.leastIndex(points, e => Math.hypot(e[0] - xm + MARGIN.left, e[1] - ym + MARGIN.top))
                const [x, y, k] = points[i]

                circles
                    .style("fill", (d) => d["label"] === k ? d["fill"] : "#47444D")
                    .filter((d) => d["label"] === k).raise()

                text
                    .attr("transform", `translate(${x},${y - 24})`)
                    .html(k)
            }

            function pointerentered() {
                circles.style("fill", "#47444D")
                markers.attr("display", null)
            }

            function pointerleft() {
                circles.style("fill", null)
                markers.attr("display", "none")
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
        "1": [-900, 600, 300],
        "2": [-600, 200, 200],
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
    let file = `data/actin_compression_pca_transforms.json`
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
