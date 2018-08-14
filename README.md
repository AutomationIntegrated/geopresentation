# geopresentation
Google Maps image flythrough presentation.

### Running
Project can be run by serving the project path from some local server. Such as:

```bash
cd $PROJECT_ROOT
python -m SimpleHTTPServer
```


### Configuration

Google Maps API key **must** to be set in `index.html`

Overlays can be configured via the `config.json`. 

```json
{
	"starting_location": { "lat":35.4535404, "long":-97.6020877 },
	"map_zoom": { "near":16, "far":12 },
	"overlay_defaults": { 
		"timings": { "panning":5000, "zooming":1000, "viewing":10000 },
		"width":1200,
		"height": 750,
		"padding": {"top":25, "right":0, "bottom":0, "left":0 },
		"margins": {"top":45, "right":30, "bottom":45, "left":100 }
   	},
	"overlays": []
}
```

| Property | Description |
| -------- | ----------- |
| `starting_location` | starting latitude and longitude map location on load |
| `map_zoom` | starting latitude and longitude map location on load |
| `overlay_defaults.timings` | default timings for panning, zooming, and viewing(idle) overlays |
| `overlay_defaults.width` | default overlay width |
| `overlay_defaults.height` | default overlay height |
| `overlay_defaults.padding` | default overlay top right bottom and left padding values |
| `overlay_defaults.margins` | default overlay top right bottom and left margins values |
| `overlays` | list of overlay definitions |



#### Image Overlay Definition

Below is an exampe of an `image` overlay.

```json
{
	"type": "image",
	"width": 539,
	"height": 322,
	"padding": {"top":0, "right":0, "bottom":0, "left":0 },
	"margins": {"top":0, "right":0, "bottom":0, "left":0 },
	"location": { "lat":34.032813, "long":-97.952580 },
	"url": "https://i.imgur.com/0dYEtqS.gif",
	"no_background": true
}
```

Required settings:

| Property | Description |
| -------- | ----------- |
| `type` | this **must** be set to `image` |
| `location` | latitude and longitude map location for the overlay |
| `width` | width of the image. Overrids default width |
| `height` | height of the image. Overrides default height |
| `url` | URL to the image. Can be local or remote. |

Optional settings:

| Property | Description |
| -------- | ----------- |
| `no_background` | should a white background be displayed with this image |



#### Bar Chart Overlay Definition

Below is an exampe of an `bar-chart` overlay.

```json
{
	"type": "bar-chart",
	"margins": { "top":45, "right":30, "bottom":25, "left":150 },
	"padding": { "top":25, "left":25, "bottom":30 },
	"x_axis_label": "Ages",
	"y_axis_label": "Population",
	"timings": { "viewing":20000 },
	"location": { "lat":35.4535404, "long":-97.6020877 },
	"live_data": { "method":"GET", "url":"data/age-population.json", "selector":"data.population", "interval":5000 }
}
```

Required settings:

| Property | Description |
| -------- | ----------- |
| `type` | this **must** be set to `bar-chart` |
| `location` | latitude and longitude map location for the overlay |
| `width` | width of the image. Overrids default width |
| `height` | height of the image. Overrides default height |

Optional settings:

| Property | Description |
| -------- | ----------- |
| `padding` | overlay specific padding. Overrides default padding |
| `margins` | overlay specific margins. Overrides default margins |
| `x_axis_label` | X axis label. If not set, no label is shown |
| `y_axis_label` | Y axis label. If not set, no label is shown |
| `data` | initial data values |
| `live_data` | options to retrieve live data on a set interval from some source |


Either `data`, `live_data` or both should be set for any data to be displayed. Data is expected to be formatted as an array of objects with `key` and `value` properties. Such as:

```json
[
	{ "key":"<5",    "value":25 },
	{ "key":"5-13",  "value":32 },
	{ "key":"14-17", "value":11 },
]
```

If data is nested inside other objects the `live_data.selector` option can be set to extract the data. For example, a selector of `"a.b.c"` could be used to extract the following data:

```json
{
	"a":{
		"b":{
			"c":[
				{ "key":"<5",    "value":25 },
				{ "key":"5-13",  "value":32 },
				{ "key":"14-17", "value":11 },
			]
		}
	}
}
```
