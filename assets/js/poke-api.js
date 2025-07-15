const pokeApi = {};

async function classificarPorCadeia(pokeDetail, types) {
    try {
        const speciesRes = await fetch(pokeDetail.species.url);
        const speciesData = await speciesRes.json();

        if (speciesData.is_mythical) return 'Mítico';
        if (speciesData.is_legendary) return 'Lendário';

        const evoRes = await fetch(speciesData.evolution_chain.url);
        const evoData = await evoRes.json();

        const currentName = speciesData.name;

        function coletarNomes(node) {
            let nomes = [];
            if (node?.species?.name) nomes.push(node.species.name);
            if (node?.evolves_to?.length > 0) {
                node.evolves_to.forEach(sub => {
                    nomes = nomes.concat(coletarNomes(sub));
                });
            }
            return nomes;
        }

        const nomesDaCadeia = coletarNomes(evoData.chain);
        const nomesUnicos = [...new Set(nomesDaCadeia)];

        const primeiroNome = evoData.chain?.species?.name;
        const primeiroRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${primeiroNome}`);
        const primeiroDetail = await primeiroRes.json();
        const primeiroTypes = primeiroDetail.types.map(t => t.type.name);
        const tipoInicial = ['grass', 'fire', 'water'].some(t => primeiroTypes.includes(t));

        if (tipoInicial && nomesUnicos.includes(currentName)) return 'Inicial';

        if (nomesUnicos.length === 3) {
            const ultimoNome = nomesUnicos[nomesUnicos.length - 1];
            const ultimoRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${ultimoNome}`);
            const ultimoDetail = await ultimoRes.json();
            const totalStats = ultimoDetail.stats.reduce((sum, stat) => sum + stat.base_stat, 0);

            if (totalStats === 600 && nomesUnicos.includes(currentName)) {
                return 'Pseudo-Lendário';
            }
        }

        return 'Comum';
    } catch (error) {
        console.warn(`Erro na classificação de ${pokeDetail.name}:`, error);
        return 'Desconhecida';
    }
}

async function convertPokeApiDetailToPokemon(pokeDetail) {
    const pokemon = new Pokemon();
    pokemon.number = pokeDetail.id;
    pokemon.name = pokeDetail.name;

    const types = pokeDetail.types.map((typeSlot) => typeSlot.type.name);
    const [type] = types;
    pokemon.types = types;
    pokemon.type = type;

    const dreamWorld = pokeDetail.sprites.other?.dream_world?.front_default;
    const officialArtwork = pokeDetail.sprites.other?.['official-artwork']?.front_default;
    const defaultSprite = pokeDetail.sprites.front_default;
    pokemon.photo = dreamWorld || officialArtwork || defaultSprite || 'https://via.placeholder.com/96';

    try {
        const speciesRes = await fetch(pokeDetail.species.url);
        const speciesData = await speciesRes.json();

        const genName = speciesData.generation?.name?.replace('generation-', '').toUpperCase();
        pokemon.generation = genName ? `Geração ${genName}` : 'Geração desconhecida';

        pokemon.classification = await classificarPorCadeia(pokeDetail, types);

    } catch (error) {
        console.warn(`Erro ao buscar dados adicionais para ${pokemon.name}:`, error);
        pokemon.classification = 'Desconhecida';
        pokemon.generation = 'Geração desconhecida';
    }

    return pokemon;
}

pokeApi.getPokemonDetail = (pokemon) => {
    return fetch(pokemon.url)
        .then((response) => response.json())
        .then(convertPokeApiDetailToPokemon);
};

pokeApi.getPokemons = (offset = 0, limit = 10) => {
    const url = `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`;

    return fetch(url)
        .then((response) => response.json())
        .then((jsonBody) => jsonBody.results)
        .then((pokemons) => pokemons.map(pokeApi.getPokemonDetail))
        .then((detailRequests) => Promise.all(detailRequests));
};