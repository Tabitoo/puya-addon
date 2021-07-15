const { addonBuilder } = require("stremio-addon-sdk")
var nameToImdb = require('name-to-imdb')
const fetch = require('node-fetch')
const needle = require('needle')

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	"id": "community.pruebasdk",
	"version": "1.0.0",
	"resources": [
		"catalog",
		{
            "name": "meta",
            "types": ["series"],
			"idPrefixes" : ["puya:"]
        },
		"stream"
	],
	"types": [
		"series"
	],
	"catalogs": [
		{
			"id" : "puya-season",
			"name" : "Puya",
			"type": "series",
			"extra": [
				{ "name": "search", "isRequired": false }
			],
		},
	],
	"name": "prueba-sdk",
	"description": "esto es una prueba"
}

async function getSeriesCatalog(catalogName) {
    let catalog = [];


    switch(catalogName) {
        case "puya-season":

			let season = await fetch("https://api.jikan.moe/v3/season");
			season = await season.json()
			let animeSeason = season.anime
		

			animeSeason.forEach(anime => {
				
				let body;
				if(anime.r18 == false){
					body = {
						id : "puya:" + anime.mal_id,
						type : "series",
						name : anime.title,
						poster : anime.image_url
					}
				}
				
				catalog.push(body)
				
			});
			
            break
        default:
            catalog = []
            break
    }

    return Promise.resolve(catalog)
}

async function getSerieStreams(id){

	console.log(id.length)
	console.log(id)
	

	const streams = {}
	const caps = []

	let nombre = await getIbmdName(id)
	
	let animes = await getAnimedb(nombre,id)
	

	animes.forEach(anime => {
			caps.push({"title" : anime.name, "infoHash" : anime.hash_code})
	});

	streams[id] = caps

	
	return Promise.resolve(streams[id] || [])
}


async function getSerieMeta(id) {

	try {
			
		let animeId = id.split(":")[1]
		let video = [];
		
		const metas = {}
		let anime = await fetch("https://api.jikan.moe/v3/anime/" + animeId);
		anime = await anime.json()
		console.log(anime)

		let animeEpisodes =  await fetch("https://api.jikan.moe/v3/anime/" + animeId + "/episodes");
		animeEpisodes = await animeEpisodes.json();

		
		
		animeEpisodes.episodes.forEach(ep => {
			let body = {
				id : id + ":" + ep.episode_id,
				released : ep.aired,
				title : ep.title,
				episode : ep.episode_id,
				
			}
			video.push(body)
			
		})

		metas[id] = {   
			id: id,
			type: "series",
			name: anime.title,
			poster: anime.image_url,
			description: anime.synopsis,
			videos : video,
			genres : ["Anime"],
			background : anime.image_url

			
		}
			
		return Promise.resolve(metas[id] || null)

		
	} catch (error) {
		console.log(error)
	}
}



async function getAnimedb(title,id){

	console.log('id: ');
	console.log(id)
	
	console.log('title: ');
	console.log(title)

	const cap = id.split(":")
	let nombre = title

	const response = await fetch('http://localhost:3000/api/animes?name=' + nombre + '&cap=' + cap[2])

	const data = await response.json();
	return data.data
}

async function getIbmdName(id){

	try {
		let nuevoCaracters = id.split(":");
		
		console.log(nuevoCaracters)
		let response = await fetch("https://api.jikan.moe/v3/anime/" + nuevoCaracters[1])
		let data = await response.json()
		
		

		return data.title;

	} catch (error) {
		console.log(error)
	}
}

const builder = new addonBuilder(manifest)

builder.defineCatalogHandler(({type, id, extra}) => {
    let results;


    switch(type) {
        case "series":
            results = getSeriesCatalog(id)
            break
       default:
            results = Promise.resolve( [] )
            break
    }
    if(extra.search) {
        return results.then(items => {
            metas: items.filter(meta => meta.name
            .toLowercase()
            .includes(extra.search.toLowercase()))
        })
    }
    const skip = extra.skip || 0;
    return results.then(items => ({
        metas: items.slice(skip, skip + 100)
    }))
})

builder.defineStreamHandler(({type, id}) => {
	console.log("request for streams: "+type+" "+id)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineStreamHandler.md
	let results;
	

	switch(type){
		case 'series':
			//getIbmdName(id)

			results = getSerieStreams(id)
	
			break
		default:
			results = Promise.resolve([])
			break
	}
	return results.then(streams => ({streams}))
})

builder.defineMetaHandler(({type, id}) => {
    // Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineMetaHandler.md
    let results;
	
	console.log(type);
	console.log(id);

	if(type == "series"){
		return getSerieMeta(id)
		.then((response) => ({meta : response}))
	}


	/*
    switch(type) {
        case 'series':
            results = getSerieMeta(id)
			return results.then(response => (console.log({meta : response})))
			
			
            break
       	default:
            results = null
            break
    }
	*/
    //return Promise.resolve({ meta: results })
	//return results.then(response => ({meta : response}))
})

module.exports = builder.getInterface() 