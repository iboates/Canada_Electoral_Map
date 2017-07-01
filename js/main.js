window.onload = function() {

	//map frame dimensions
	var width = 800;
	var height = 400;

	//create Canada Alberts equal area conic projection, centred on Canada
	var projection = d3.geo.albers()
        .center([20, 62])
		.rotate([100, 0, 0])
		.parallels([50, 70])
		.scale(700)
		.translate([width / 2, (height / 2)]);

    //create svg path generator using the projection
    var path = d3.geo.path()
        .projection(projection);

	// set zoom behaviour
    var zoom = d3.behavior.zoom()
        .translate(projection.translate())
        .scale(projection.scale())
        .scaleExtent([height, 50 * height])
        .on("zoom", zoomed);

    //create a new svg element with the above dimensions
    var svg = d3.select('#map-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    var g = svg.append('g')
		.call(zoom);

    g.append('rect')
		.attr('class', 'background')
		.attr('width', width)
		.attr('height', height);

	//use queue.js to parallelize asynchronous data loading
	queue()
		.defer(d3.json, "data/canada_districts_4326.topojson") //load geometry
		.await(callback); //trigger callback function once data is loaded


	function callback(error) {

        d3.json("data/canada_districts_4326.topojson", function(error, ridings) {
            if (error) throw error;

			g.append("g")
				.attr("class", "ridings")
				.selectAll("path")
				.data(topojson.feature(ridings, ridings.objects.canada_districts_4326).features)
                .enter()
				.append("path")
                .attr('id', function(d) { return 'FEDNUM' + d.properties.FEDNUM })
				.attr("d", path)
                .on('mouseover', highlight)
                .on('mouseout', dehighlight)
                .on('click', getInfo);

        });

	};


	function highlight(data) {

		//TODO: disjoint ridings need to highlight together

		var props = data.properties;

        d3.select('#FEDNUM' + props.FEDNUM) //select the current region in the DOM
			.style('fill', '#000'); //set the enumeration unit fill to black

	}


	function dehighlight (data) {

        var props = data.properties;

        d3.select('#FEDNUM' + props.FEDNUM) //select the current region in the DOM
            .style('fill', '#fff'); //set the enumeration unit fill to black

	}


	function getInfo(data) {

		var side = $('input[name=left-or-right]:checked').val();

        var requestString = 'http://represent.opennorth.ca/representatives/?district_name='
			                + data.properties.ENNAME.replace(/--/g, '—')
							+ '&elected_office=MP'
		var ridingRequest = new XMLHttpRequest();
		ridingRequest.open('GET', requestString, true);
		
        ridingRequest.onload = function (e) {
            if (ridingRequest.readyState === 4) {
                if (ridingRequest.status === 200) {

                	ridingJSON = JSON.parse(ridingRequest.responseText);
                	//console.log(ridingJSON);

					$('#riding-name-' + side).text(ridingJSON.objects["0"].district_name);
                    $('#mp-name-' + side).text(ridingJSON.objects["0"].name);
                    $('#map-party-' + side).text(ridingJSON.objects["0"].party_name);
                    $('#mp-url-left' + side).text(ridingJSON.objects["0"].personal_url);
                    $('#mp-office-address-' + side).text(ridingJSON.objects["0"].offices[1].postal);
                    $('#mp-office-tel-' + side).text(ridingJSON.objects["0"].offices[1].tel);
                    $('#mp-office-fax-' + side).text(ridingJSON.objects["0"].offices[1].fax);
                    $('#mp-office-parl-address-' + side).text(ridingJSON.objects["0"].offices["0"].postal);
                    $('#mp-office-parl-tel-' + side).text(ridingJSON.objects["0"].offices["0"].tel);
                    $('#mp-office-parl-fax-' + side).text(ridingJSON.objects["0"].offices["0"].fax);
                    $('#mp-photo-' + side).html('<img src="' + ridingJSON.objects["0"].photo_url + '">');
                    $('#mp-parl-url-' + side).text(ridingJSON.objects["0"].url);

                }
            }
        };

        ridingRequest.send(null);

	}

    function zoomed() {

        projection.translate(d3.event.translate).scale(d3.event.scale);
        g.selectAll("path").attr("d", path);

    }

}