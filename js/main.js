window.onload = function() {

    side = $('input[name=left-or-right]:checked').val();
    $('input[name=left-or-right]').change(function(){
    	side = $('input[name=left-or-right]:checked').val();
	})

    $('#get-bill-history-button').click(appendBillHistory);

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

                var mpName = ridingJSON.objects["0"].name;
                var ballotRequestString = 'http://api.openparliament.ca/votes/ballots/?politician='
                    + mpName.replace(/ /g, '-').toLowerCase()
                    + '&format=json';

				// Get the ballot information (voting history) for the MP
                /*$.ajax({

                    url: ballotRequestString,
					data: {format: 'json'},
					error: function() {console.log('error when processing riding request')},
					success: function(result) {

                        console.log($('.vote-list-item').length);
                        if ($('.vote-list-item').length == 0) {

                            var ballotJSON = result;

                            for (i = 0; i < ballotJSON.objects.length; i++) {

                                var voteRequestString = 'http://api.openparliament.ca'
                                    + ballotJSON.objects[i].vote_url
                                    + '?format=json';

                                // Get the information of each vote
                                appendVoteHistory(i, voteRequestString, ballotJSON);

                            }

                        }
                    }
				})*/

			}
		});

	};


	function appendBillHistory() {

	    $('.vote-result-item-centre').parent().remove();

	    billRequestString = 'http://api.openparliament.ca/bills/?format=json';

        $.ajax({

            url: billRequestString,
            data: {format: 'json'},
            error: function () {
                console.log('error when processing bill request')
            },
            success: function (result) {

            	var billJSON = result;

            	//console.log(billJSON);

            	for (var i=0; i<billJSON.objects.length; i++) {
            	    //console.log(billJSON.objects[i]);
                    //var vote_item = $('<div>').attr('class', 'vote-list-item').attr('id', 'vote-item-centre-' + i);
                    //console.log(vote_item);

                    vote_item = '<div class="container-fluid"><div class="row"><div class="vote-result-item-centre" id="'
                                + billJSON.objects[i].number
                                + '|'
                                + String(billJSON.objects[i].session)
                                + '"><b>Bill '
                                + billJSON.objects[i].number
                                + ', Session '
                                + billJSON.objects[i].session
                                + ' (Introduced '
                                + billJSON.objects[i].introduced
                                + '):'
                                + '</b> '
                                + billJSON.objects[i].name.en
                                + '</div></div></div>';

                    $('#vote-result-column-centre').append(vote_item);

                }

                if ( !$('#mp-name-left').is(':empty') ) {
                    appendBallotHistory('left');
                }

                if ( !$('#mp-name-right').is(':empty') ) {
                    appendBallotHistory('right');
                }

            }

        });

	}


    function appendBallotHistory(side) {

        var mpName = $('#mp-name-' + side).text();
        var ballotRequestString = 'http://api.openparliament.ca/votes/ballots/?politician='
            + mpName.replace(/ /g, '-').toLowerCase()
            + '&format=json';

        for (var i=0; i<$('.vote-result-item-centre').length; i++) {

            var bill_and_session = $('.vote-result-item-centre')[i].id.split('|');
            //console.log(bill_and_session)

            $.ajax({

                url: ballotRequestString,
                data: {format: 'json'},
                error: function () {
                    console.log('error when processing ballot request')
                },
                success: function (result) {

                    var ballotJSON = result;
                    //console.log(ballotJSON.objects);

                    //vote_html.appendTo('#votes-container');

                    //$('#vote-result-column-centre').append(vote_item);

                }

            });

        }

    }

}