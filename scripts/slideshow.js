let activeIndex = 0

function showSlides(index, loop=true) {
    index = showSlide(index, loop)

    if (loop) {
        timer = setTimeout(showSlides, 5000, index + 1)
    } else {
        clearTimeout(timer)
    }
}

function showSlide(index, loop=false) {
    let slides = document.getElementsByClassName("slide")
    let dots = document.getElementsByClassName("dot")

    if (index == -1) {
        index = slides.length - 1
    }

    index = index % slides.length
    activeIndex = index

    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none"
        if (!loop) {
            slides[i].className = slides[i].className.replace(" fullfade", " fadein")
        }
    }

    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "")
    }

    slides[index].style.display = "block"
    dots[index].className += " active"

    return index
}

function nextSlide() {
    showSlides(activeIndex + 1, false)
}

function prevSlide() {
    showSlides(activeIndex - 1, false)
}
