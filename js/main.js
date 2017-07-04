window.onload = function() {

    // initialize radio buttons for selecting the side
    side = $('input[name=left-or-right]:checked').val();
    $('input[name=left-or-right]').change(function() {
    	side = $('input[name=left-or-right]:checked').val();
	});

    // append the most recent votes
    appendVoteHistory();

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
		.await(initializeMap); //trigger callback function once data is loaded


	function initializeMap(error) {

        d3.json("data/canada_districts_4326.topojson", function(error, ridings) {
            if (error) throw error;

			g.append("g")
				//.attr("class", "ridings")
				.selectAll("path")
				.data(topojson.feature(ridings, ridings.objects.canada_districts_4326).features)
                .enter()
				.append("path")
                .attr("class", function(d) { return 'ridings FEDNUM' + d.properties.FEDNUM })
				.attr("d", path)
                .on('mouseover', highlight)
                .on('mouseout', dehighlight)
                .on('click', getInfo);

        });

	};


	function highlight(data) {

		var props = data.properties;

        d3.selectAll('.FEDNUM' + props.FEDNUM) //select the current region in the DOM
			.style('fill', '#000'); //set the enumeration unit fill to black

	}


	function dehighlight (data) {

        var props = data.properties;

        d3.selectAll('.FEDNUM' + props.FEDNUM) //select the current region in the DOM
            .style('fill', '#fff'); //set the enumeration unit fill to black

	}


    function zoomed() {

        projection.translate(d3.event.translate).scale(d3.event.scale);
        g.selectAll("path").attr("d", path);

    }


    function getInfo(data) {

        var ridingRequestString = 'http://represent.opennorth.ca/representatives/?district_name='
            + data.properties.ENNAME.replace(/--/g, '—')
            + '&elected_office=MP';

		// Get The MP information by querying the riding
		$.ajax({

			url: ridingRequestString,
			data: {format: 'json'},
			error: function() {console.log('error when processing riding request')},
			success: function(result) {

                ridingJSON = result;
                //console.log(ridingJSON)

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

                appendBallotHistory(side);

            }

		});

	};


	function appendVoteHistory() {

	    $('.vote-description').parent().remove();
        $('.ballot-item-' + side).parent().remove();

	    voteRequestString = 'http://api.openparliament.ca/votes/?format=json';

        $.ajax({

            url: voteRequestString,
            data: {format: 'json'},
            error: function () {
                console.log('error when processing bill request')
            },
            success: function (result) {

            	var voteJSON = result;

            	//console.log(voteJSON);

            	for (var i=0; i<voteJSON.objects.length; i++) {

            	    if (i%2 == 0) {

                        vote_item = '<div class="row vote-result-even"><div class="col-sm-2 ballot-left" id="vote-result-item-left|'
                            + voteJSON.objects[i].url
                            + '"></div><div class="col-sm-8 vote-description" id="vote-description|'
                            + voteJSON.objects[i].url
                            + '"><b>'
                            + voteJSON.objects[i].date
                            + ':'
                            + '</b> '
                            + voteJSON.objects[i].description.en
                            + '</div><div class="col-sm-2 ballot-right" id="vote-result-item-right|'
                            + voteJSON.objects[i].url
                            + '"></div></div>';

                    } else {
                        vote_item = '<div class="row vote-result-odd"><div class="col-sm-2 ballot-left" id="vote-result-item-left|'
                            + voteJSON.objects[i].url
                            + '"></div><div class="col-sm-8 vote-description" id="vote-description|'
                            + voteJSON.objects[i].url
                            + '"><b>'
                            + voteJSON.objects[i].date
                            + ':'
                            + '</b> '
                            + voteJSON.objects[i].description.en
                            + '</div><div class="col-sm-2 ballot-right" id="vote-result-item-right|'
                            + voteJSON.objects[i].url
                            + '"></div></div>';
                    }

                    $('#info-block-centre').append(vote_item);

                }

            }

        });

	}


    function appendBallotHistory(instant_side) {

	        // We use the variable "instant_side" here to get the selected side at the instant of the selection of an MP.
            // If we were to just use the global "side" variable directly, then the ballots would start getting filled
            // out on whatever side was currently selected, putting ballots on the wrong side if the other side was
            // selected while the ballots were still being loaded.

            var mpName = $('#mp-name-' + instant_side).text();

            $('.ballot-text-' + instant_side).remove();
            $('.ballot-' + instant_side)
                .removeClass('ballot-yes')
                .removeClass('ballot-no')
                .removeClass('ballot-did-not-vote');

        // TODO: understand this because it is weird
        for (var i = 0; i < $('.vote-description').length; i++) {
            getBallot(i);
        }

            function getBallot(i) {

                var voteRef = $('.vote-description')[i].id.split('|')[1];
                //console.log(voteRef)

                var ballotRequestString = 'http://api.openparliament.ca/votes/ballots/?vote='
                    + voteRef
                    + '&politician='
                    + mpName.replace(/ /g, '-').toLowerCase()
                    + '&format=json';
                //console.log(ballotRequestString)

                $.ajax({

                    url: ballotRequestString,
                    data: {format: 'json'},
                    error: function () {
                        console.log('error when processing ballot request')
                    },
                    success: function (result) {

                        var ballotJSON = result;
                        //console.log(ballotJSON)

                        ballot_item = '<div class="floater"></div><div class="ballot-text-left">' + ballotJSON.objects["0"].ballot + '</div>';
                        //console.log('#vote-result-item-' + instant_side + '' + voteRef)

                        if (ballotJSON.objects["0"].ballot == 'Yes') {
                            document.getElementById('vote-result-item-' + instant_side + '|' + voteRef).classList.add('ballot-yes');
                        } else if (ballotJSON.objects["0"].ballot == 'No') {
                            document.getElementById('vote-result-item-' + instant_side + '|' + voteRef).classList.add('ballot-no');
                        } else if (ballotJSON.objects["0"].ballot == 'Didn\'t vote') {
                            document.getElementById('vote-result-item-' + instant_side + '|' + voteRef).classList.add('ballot-did-not-vote');
                        }

                        document.getElementById('vote-result-item-' + instant_side + '|' + voteRef).innerHTML = ballot_item;

                    }

                });

        }

    }

}

//TODO: accents in MP names are fucking everything up