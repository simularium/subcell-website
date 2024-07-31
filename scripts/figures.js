function individual_viz_link(simulator, velocity, replicate_name) {
    let base_link = `https://simularium.allencell.org/viewer?trajUrl=https://${simulator}-working-bucket.s3.us-west-2.amazonaws.com`
    let series = (velocity == "0000") ? "NO_COMPRESSION" : "COMPRESSION_VELOCITY"
    if (simulator == "readdy") {
        series = `ACTIN_${series}`
    }
    let velocity_name = (velocity == "0000") ? "" : "_" + velocity
    return `${base_link}/${series}/viz/${series}${velocity_name}_${replicate_name}.simularium`
}

function generate_filaments_table() {
    const ID = "filaments_table"

    // Get selected replicate.
    let replicate = document.querySelector("input[name=replicate]:checked").id.replace("replicate_", "")
    let replicate_name = "00000" + (Number(replicate) + 1)

    let velocities = ["0000", "0047", "0150", "0470", "1500"]

    // Update links and images for monomer-scale simulations.
    velocities.forEach(velocity => d3.select(`#${ID}_monomer_${velocity}`)
        .html(null)
        .append("a")
        .attr("target", "_blank")
        .attr("href", individual_viz_link("readdy", velocity, replicate_name))
        .append("img")
        .attr("src", `img/actin_compression_matrix_placeholder_replicate_${replicate}.jpg`))

    // Update links and images for fiber-scale simulations.
    velocities.forEach(velocity => d3.select(`#${ID}_fiber_${velocity}`)
        .html(null)
        .append("a")
        .attr("target", "_blank")
        .attr("href", individual_viz_link("cytosim", velocity, replicate_name))
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

    const WIDTH = 500

    const HEIGHT = 320

    const MARGIN = {
        left: 20,
        right: 20,
        top: 10,
        bottom: 5,
    }

    let XAXIS = {
        PCA1: {
            "bounds": [-900, 600],
            "n": 6,
            "padding": 250,
            "interval": 300,
        },
        PCA2: {
            "bounds": [-500, 200],
            "n": 8,
            "padding": 50,
            "interval": 200,
        },
        INSET: {
            "bounds": [-280, 280],
            "padding": 0,
        }
    }

    let YAXIS = {
        PCA1: {
            "bounds": [0, 650 / 2]
        },
        PCA2: {
            "bounds": [0, 650]
        },
        INSET: {
            "bounds": [-280, 280],
            "padding": 0,
        }
    }

    const COLORMAP = ["#f9ddda", "#f2b9c4", "#e597b9", "#ce78b3", "#ad5fad", "#834ba0", "#573b88"]

    // Clear canvas.
    let node = document.getElementById(ID)
    while (node.firstChild) {
        node.removeChild(node.firstChild)
    }

    // Create SVG.
    let SVG = d3
        .select(`#${ID}`)
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .append("g")

    SVG.append("rect").attr("width", WIDTH).attr("height", HEIGHT).attr("fill", "#1e1b25")//.attr('stroke', 'red')

    // Calculate size of figure and add offset group.
    let width = WIDTH - MARGIN.left - MARGIN.right
    let height = HEIGHT - MARGIN.top - MARGIN.bottom
    let G = SVG.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)

    // Get selected option.
    let component = document
        .querySelector("input[name=component]:checked")
        .id.replace("component_", "")
    let component_number = Number(component.replace("PCA", ""))

    // Get axis
    let xaxis = XAXIS[component]
    let yaxis = YAXIS[component]

    let colormap = d3
        .scaleLinear()
        .range(COLORMAP)
        .domain(linspace(xaxis.bounds[0] - xaxis.padding, xaxis.bounds[1] + xaxis.padding, COLORMAP.length))

    let INSET_SIZE = 350
    let padding = 10
    let hscale = 0.4
    let vscale = 0.25
    let lscale = 0.25
    let offset = (width - ((1 + vscale) * INSET_SIZE) - padding) / 2
    let INSETS = G.append("g").attr("transform", `translate(${offset},0)`)
    let XY = INSETS.append("g").attr("transform", `translate(${vscale * INSET_SIZE + padding},0)`)
    createInset(XY, INSET_SIZE, hscale * INSET_SIZE, "X", "Y")
    let XZ = INSETS.append("g").attr("transform", `translate(${vscale * INSET_SIZE + padding},${hscale * INSET_SIZE + padding})`)
    createInset(XZ, INSET_SIZE, lscale * INSET_SIZE, "X", "Z")
    let YZ = INSETS.append("g").attr("transform", `translate(0,0)`)
    createInset(YZ, vscale * INSET_SIZE, hscale * INSET_SIZE, "Y", "Z")

    Promise.all([
        d3.csv("data/actin_compression_pca_results.csv"),
        d3.json("data/actin_compression_pca_transforms.json"),
    ]).then(data => {
            // Calculate scaling.
            let xscale = makeHorizontalScale(width, xaxis)
            let yscale = makeVerticalScale(50, yaxis)

            // Create slider.
            let slider = d3
                .sliderHorizontal(xscale)
                .min(xaxis.bounds[0] - xaxis.padding)
                .max(xaxis.bounds[1] + xaxis.padding)
                .step(50)
                .width(WIDTH - MARGIN.left - MARGIN.right)
                .tickValues(linspace(xaxis.bounds[0], xaxis.bounds[1], xaxis.n))
                .handle("M7.979,0A7.979,7.979,0,1,1,-7.979,0A7.979,7.979,0,1,1,7.979,0")
                .displayValue(false)
                .on('onchange', slidermoved)

            d3.select(`#${ID}_slider`)
                .html(null)
                .append('svg')
                .attr('width', WIDTH)
                .attr('height', 50)
                .append('g')
                .attr('transform', `translate(${MARGIN.left},10)`)
                .call(slider)

            // Convert data into histograms.
            let cytosim = data[0].filter(d => d["SIMULATOR"] == "CYTOSIM")
            let readdy = data[0].filter(d => d["SIMULATOR"] == "READDY")
            let domain = [xaxis.bounds[0] - xaxis.padding, xaxis.bounds[1] + xaxis.padding]
            let thresholds = linspace(domain[0], domain[1], 51)

            // Set histogram parameters for the histogram
            const histogram = d3.bin()
                .value(d => d[component])
                .domain(domain)
                .thresholds(thresholds)

            let entries = [
                {
                    "bins": histogram(cytosim),
                    "stroke": "#008080",
                },
                {
                    "bins": histogram(readdy),
                    "stroke": "#ca562c",
                }
            ]

            // Plot paths.
            G.append("g")
                .attr("transform", `translate(0,${height - 50})`)
                .selectAll("path").data(entries).enter()
                .append("path")
                .attr("d", function(d) {
                    let makePath = d3.line()
                        .x((m,i) => xscale(m.x0))
                        .y((m,i) => yscale(m.length))
                        .curve(d3.curveStepAfter)
                    return makePath(d.bins)
                })
                .attr("fill", d => d.stroke)
                .attr("fill-opacity", 0.5)
                .attr("stroke", d => d.stroke)
                .attr("stroke-width", 1)

            let xscale_inset = makeHorizontalScale(INSET_SIZE, XAXIS["INSET"])
            let yscale_inset = makeVerticalScale(INSET_SIZE, YAXIS["INSET"])

            // Convert data into paths.
            let transform_entries = data[1]
                .filter(d => d["component"] == component_number)
                .map((entry) => {
                    let point = entry["point"]
                    return {
                        "x": entry["x"],
                        "y": entry["y"],
                        "z": entry["z"],
                        "stroke": colormap(point),
                        "point": point
                    }
                })

            // Plot paths.
            let xy_paths = XY.append("g")
                .attr("transform", "translate(10,-50)")
                .selectAll("path").data(transform_entries).enter()
                .append("path")
                .attr("d", function(d) {
                    let makePath = d3.line()
                        .x(m => xscale_inset(m))
                        .y((m,i) => yscale_inset(d.y[i]))
                    return makePath(d.x)
                })
                .attr("fill", d => "none")
                .attr("stroke", d => (d.point == 0 ? d.stroke : "none"))
                .attr("stroke-width", 2)
                .attr("stroke-linecap", "round")

            let xz_paths = XZ.append("g")
                .attr("transform", "translate(10,-130)")
                .selectAll("path").data(transform_entries).enter()
                .append("path")
                .attr("d", function(d) {
                    let makePath = d3.line()
                        .x(m => xscale_inset(m))
                        .y((m,i) => yscale_inset(d.z[i]))
                    return makePath(d.x)
                })
                .attr("fill", d => "none")
                .attr("stroke", d => (d.point == 0 ? d.stroke : "none"))
                .attr("stroke-width", 2)
                .attr("stroke-linecap", "round")

            let yz_paths = YZ.append("g")
                .attr("transform", "translate(-130,-50)")
                .selectAll("path").data(transform_entries).enter()
                .append("path")
                .attr("d", function(d) {
                    let makePath = d3.line()
                        .x(m => xscale_inset(m))
                        .y((m,i) => yscale_inset(d.y[i]))
                    return makePath(d.z)
                })
                .attr("fill", d => "none")
                .attr("stroke", d => (d.point == 0 ? d.stroke : "none"))
                .attr("stroke-width", 2)
                .attr("stroke-linecap", "round")

            function slidermoved(event) {
                let point = Math.round(event)
                xy_paths
                    .style("stroke", (d) => d.point === point ? d.stroke : "none")
                    .filter((d) => d.point === point).raise()
                xz_paths
                    .style("stroke", (d) => d.point === point ? d.stroke : "none")
                    .filter((d) => d.point === point).raise()
                yz_paths
                    .style("stroke", (d) => d.point === point ? d.stroke : "none")
                    .filter((d) => d.point === point).raise()
            }
        })
        .catch((error) => {
            console.log(error)
        })
}
