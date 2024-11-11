function loadStats() {
    fetch('/stats_data')
        .then(response => response.json())
        .then(data => {
            drawChart(data);
        });
}

function drawChart(data) {
    // Очистка предыдущего графика
    d3.select("#chart").selectAll("*").remove();

    var width = 280; // Ширина графика, чтобы поместился в левую панель
    var height = 400;
    var margin = { top: 20, right: 20, bottom: 40, left: 60 };

    var svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var x = d3.scaleLinear()
        .range([margin.left, width - margin.right]);

    var y = d3.scaleBand()
        .range([margin.top, height - margin.bottom])
        .padding(0.1);

    x.domain([0, d3.max(data, function(d) { return d.count; })]);
    y.domain(data.map(function(d) { return d.name; }));

    svg.append("g")
        .attr("fill", "steelblue")
        .selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("x", x(0))
        .attr("y", function(d) { return y(d.name); })
        .attr("width", function(d) { return x(d.count) - x(0); })
        .attr("height", y.bandwidth());

    svg.append("g")
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(x).ticks(width / 80))
        .attr("font-size", '10px');

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .attr("font-size", '10px');
}

// Загрузка статистики при загрузке страницы
loadStats();
