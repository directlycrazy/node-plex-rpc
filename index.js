const { PlexOauth, IPlexClientDetails } = require('plex-oauth');
const open = require('open');
const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let clientInformation = {
	clientIdentifier: "Inspare",
	product: "DiscordRichPresence",
	device: "Windows",
	version: "1",
	forwardUrl: "https://localhost:3000",
	platform: "Web",
};

const plexOauth = new PlexOauth(clientInformation);

console.log('Opening Plex Auth Page');
plexOauth.requestHostedLoginURL().then(async data => {
	let [hostedUILink, pinId] = data;
	console.log('If your browser has not opened, click the link below.');
	console.log(hostedUILink);
	await open(hostedUILink, { wait: true });
	rl.question('Press enter once authenticated.', () => {
		plexOauth.checkForAuthToken(pinId).then(authToken => {
			if (authToken === null) return console.log('User has not signed in.');
			const client = require('discord-rich-presence')('1000157002246406335');
			const api = require('plex-api');
			rl.question('What is your Plex server IP?\n', (server_ip) => {
				if (!server_ip) return;
				rl.question('What is your Plex server port?\n', (server_port) => {
					if (isNaN(server_port)) return;
					rl.question('What is your Plex username?\n', (plex_username) => {
						if (!plex_username) return;
						const plex_client = new api({
							hostname: server_ip,
							port: Number(server_port),
							token: authToken
						});
						var prev_session;
						var session;
						const update_status = () => {
							if (prev_session !== undefined && (session.guid === prev_session.guid) && (session.Player.state === prev_session.Player.state)) return;
							prev_session = session;
							let state = '';
							let details = '';
							switch (session.type) {
								case 'track':
									state = `${session.grandparentTitle} on ${session.parentTitle}`;
									details = `${session.Player.state === 'paused' ? '⏸' : '▶'} Listening to ${session.title}`;
									break;
								case 'episode':
									details = `${session.Player.state === 'paused' ? '⏸' : '▶'} ${session.grandparentTitle}`;
									state = `S${session.parentTitle.replace('Season ', '')} E${session.index} - ${session.title}`;
									break;
								default:
									details = `${session.Player.state === 'paused' ? '⏸' : '▶'} ${session.title}`;
									state = session.tagline;
									break;
							}
							console.log(`Updated: ${details}, ${state}`);
							client.updatePresence({
								state: state,
								details: details,
								startTimestamp: session.Player.state === 'paused' ? Date.now() : Date.now(),
								endTimestamp: session.Player.state === 'paused' ? Date.now() : (Date.now() + session.duration) - session.viewOffset,
								largeImageKey: 'logo',
								largeImageText: 'inspare.cc',
								instance: true,
							});
						};
						setInterval(() => {
							plex_client.query("/status/sessions").then(function (result) {
								if (result.MediaContainer.size === 0) return client.updatePresence({ instance: false });
								result.MediaContainer.Metadata.forEach((data, i) => {
									if (data.User.title === plex_username) {
										session = data;
									}
								});
								return update_status();
							}, function (err) {
								console.error("Could not connect to server", err);
							});
						}, 5000);
					});
				});
			});
		}).catch(err => {
			throw err;
		});
	});
}).catch(err => {
	throw err;
});
