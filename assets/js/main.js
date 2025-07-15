const pokemonList = document.getElementById('pokemonList');
const loadMoreButton = document.getElementById('loadMoreButton');
const generationSelect = document.getElementById('generationSelect');

let maxRecords = 1025;
const limit = 10;
let offset = 0;

function convertPokemonToLi(pokemon) {
    return `
        <li class="pokemon ${pokemon.type}">
            <span class="number">#${pokemon.number}</span>
            <span class="name">${pokemon.name}</span>
            <div class="detail">
                <ol class="types">
                    ${pokemon.types.map((type) => `<li class="type ${type}">${type}</li>`).join('')}
                </ol>
                <img src="${pokemon.photo}" alt="${pokemon.name}">
            </div>
            <div class="meta">
                <span class="classification"><strong>Classificação:</strong> ${pokemon.classification}</span><br>
                <span class="generation"><strong>Geração:</strong> ${pokemon.generation}</span>
            </div>
        </li>
    `;
}

function loadPokemonItens(offset, limit) {
    pokeApi.getPokemons(offset, limit).then((pokemons = []) => {
        const newHtml = pokemons.map(convertPokemonToLi).join('');
        pokemonList.innerHTML += newHtml;
    });
}

loadMoreButton.addEventListener('click', () => {
    offset += limit;
    const qtdRecordsWithNextPage = offset + limit;

    if (qtdRecordsWithNextPage >= maxRecords) {
        const newLimit = maxRecords - offset;
        loadPokemonItens(offset, newLimit);
        loadMoreButton.parentElement.removeChild(loadMoreButton);
    } else {
        loadPokemonItens(offset, limit);
    }
});

generationSelect.addEventListener('change', async (event) => {
    const genId = event.target.value;
  
    if (!genId) {
      offset = 0;
      pokemonList.innerHTML = '';
      loadMoreButton.style.display = 'flex';
      loadPokemonItens(offset, limit);
      return;
    }
  
    loadMoreButton.style.display = 'none';
    pokemonList.innerHTML = '';
  
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/generation/${genId}/`);
      const data = await response.json();
      const species = data.pokemon_species;
  
      // Ordena por número
      species.sort((a, b) => {
        const aId = parseInt(a.url.split("/").filter(Boolean).pop());
        const bId = parseInt(b.url.split("/").filter(Boolean).pop());
        return aId - bId;
      });
  
      // Busca detalhes dos Pokémon via ID
      const pokemonDetails = await Promise.all(
        species.map(async (specie) => {
          try {
            const id = specie.url.split("/").filter(Boolean).pop();
            const detailResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            if (!detailResponse.ok) throw new Error(`Pokémon não encontrado: ${id}`);
            const detail = await detailResponse.json();
            return await convertPokeApiDetailToPokemon(detail);
          } catch (error) {
            console.warn(`Ignorado: ${error.message}`);
            return null;
          }
        })
      );
  
      const validDetails = pokemonDetails.filter(p => p !== null);
  
      if (validDetails.length === 0) {
        pokemonList.innerHTML = `<p class="aviso-geracao">Nenhum Pokémon disponível para esta geração.</p>`;
      } else {
        const newHtml = validDetails.map(convertPokemonToLi).join('');
        pokemonList.innerHTML = newHtml;
      }
  
    } catch (error) {
      console.error('Erro ao carregar geração:', error);
      pokemonList.innerHTML = `<p class="erro-geracao">Erro ao buscar Pokémon da geração ${genId}.</p>`;
    }
  });

// Carregamento inicial (todos os Pokémon com paginação)
loadPokemonItens(offset, limit);