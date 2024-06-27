function handleResize() {
    let halfHeight = window.innerHeight * 0.6
    let marginTop = window.innerHeight * 0.25

    right
        .style("height", halfHeight + "px")
        .style("top", marginTop + "px")

    scroller.resize()
}

function handleStepEnter(response) {
    console.log(response);
    steps.classed("is-active", (d, i) => i === response.index)
    sticks.classed("is-active", (d, i) => i === response.index)
}

function setupStickyfill() {
    d3.selectAll(".sticky").each(function() {
        Stickyfill.add(this)
    })
}

function init() {
    setupStickyfill()
    handleResize()

    scroller
        .setup({
            step: "#content #left .step",
            offset: 0.4,
            debug: false
        })
        .onStepEnter(handleStepEnter)

    window.addEventListener("resize", handleResize)
}
