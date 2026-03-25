const env = require("../config/env");
const { getPlatformFeatureMap } = require("./settingsService");

const fallbackMatches = [
  {
    id: "fallback-match-1",
    name: "BGMI Masters Showmatch",
    status: "scheduled",
    begin_at: "2026-03-10T13:30:00.000Z",
    league: "IQ Featured Series",
    serie: "Showmatch Weekend",
    opponents: ["Team Soul", "GodLike Esports"]
  },
  {
    id: "fallback-match-2",
    name: "Pro Scrim Finals",
    status: "running",
    begin_at: "2026-03-12T15:00:00.000Z",
    league: "BGMI Pro Circuit",
    serie: "Week 4",
    opponents: ["Blind Esports", "Revenant XSpark"]
  },
  {
    id: "fallback-match-3",
    name: "Qualifier Lobby Alpha",
    status: "scheduled",
    begin_at: "2026-03-15T11:00:00.000Z",
    league: "Open Qualifier",
    serie: "Group A",
    opponents: ["Velocity Gaming", "Orangutan"]
  }
];

const fallbackTournaments = [
  {
    id: "fallback-tournament-1",
    name: "Krafton Invitational",
    begin_at: "2026-03-20T12:00:00.000Z",
    prizepool: "INR 2,500,000",
    league: "South Asia"
  },
  {
    id: "fallback-tournament-2",
    name: "BGMI Challenger Cup",
    begin_at: "2026-03-27T10:00:00.000Z",
    prizepool: "INR 1,000,000",
    league: "India Open"
  }
];

const fallbackTeams = [
  {
    id: "fallback-team-1",
    name: "Team Soul",
    acronym: "SOUL",
    current_videogame: "PUBG Mobile"
  },
  {
    id: "fallback-team-2",
    name: "GodLike Esports",
    acronym: "GL",
    current_videogame: "PUBG Mobile"
  },
  {
    id: "fallback-team-3",
    name: "Revenant XSpark",
    acronym: "RNTX",
    current_videogame: "PUBG Mobile"
  }
];

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeMatch(match) {
  return {
    id: match.id,
    name: match.name || `${match.league?.name || "Esports"} Match`,
    status: match.status || "scheduled",
    begin_at: formatDate(match.begin_at),
    league: match.league?.name || "Unknown League",
    serie: match.serie?.full_name || match.serie?.name || "Upcoming Series",
    opponents: Array.isArray(match.opponents)
      ? match.opponents.map((item) => item.opponent?.name).filter(Boolean)
      : []
  };
}

function normalizeTournament(tournament) {
  return {
    id: tournament.id,
    name: tournament.name || tournament.serie?.full_name || "Upcoming Tournament",
    begin_at: formatDate(tournament.begin_at),
    prizepool: tournament.prizepool || "TBA",
    league: tournament.league?.name || "Global Esports"
  };
}

function normalizeTeam(team) {
  return {
    id: team.id,
    name: team.name || "Unknown Team",
    acronym: team.acronym || team.slug || "TEAM",
    current_videogame: team.current_videogame?.name || "Esports"
  };
}

async function fetchPandaScore(path) {
  const response = await fetch(`${env.pandaScoreBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${env.pandaScoreApiKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`PandaScore responded with ${response.status}`);
  }

  return response.json();
}

function buildFallbackOverview(message, enabled) {
  return {
    provider: "pandascore",
    enabled,
    connected: false,
    message,
    matches: fallbackMatches,
    tournaments: fallbackTournaments,
    teams: fallbackTeams,
    schedules: fallbackMatches.map((match) => ({
      id: match.id,
      label: `${match.name} - ${match.league}`,
      begin_at: match.begin_at
    }))
  };
}

async function getExternalEsportsOverview() {
  const featureMap = await getPlatformFeatureMap();
  const integrationEnabled = Boolean(featureMap.external_api_integration);

  if (!integrationEnabled) {
    return buildFallbackOverview("External esports integrations are disabled in platform settings.", false);
  }

  if (!env.pandaScoreApiKey) {
    return buildFallbackOverview("PANDASCORE_API_KEY is not configured. Showing curated fallback esports data.", true);
  }

  try {
    const [matches, tournaments, teams] = await Promise.all([
      fetchPandaScore("/matches/upcoming?page[size]=4&sort=begin_at"),
      fetchPandaScore("/tournaments/upcoming?page[size]=4&sort=begin_at"),
      fetchPandaScore("/teams?page[size]=4")
    ]);

    const normalizedMatches = (matches || []).map(normalizeMatch);
    const normalizedTournaments = (tournaments || []).map(normalizeTournament);
    const normalizedTeams = (teams || []).map(normalizeTeam);

    return {
      provider: "pandascore",
      enabled: true,
      connected: true,
      message: "Live esports data connected through PandaScore.",
      matches: normalizedMatches,
      tournaments: normalizedTournaments,
      teams: normalizedTeams,
      schedules: normalizedMatches.map((match) => ({
        id: match.id,
        label: `${match.name} - ${match.serie}`,
        begin_at: match.begin_at
      }))
    };
  } catch (error) {
    return buildFallbackOverview(`Live esports feed unavailable. ${error.message}`, true);
  }
}

module.exports = {
  getExternalEsportsOverview
};
