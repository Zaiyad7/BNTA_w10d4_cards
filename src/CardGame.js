import React, { Component } from "react";
import "./CardGame.css";
const BACK_CARD = "https://deckofcardsapi.com/static/img/back.png";
const DEALER_PAUSE = 1500;

// Defines state of component.
class CardGame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deckSize: 6,
      hitMeDisabled: false,
      playerCards: [],
      pcCards: [],
      pcText: "",
      pcBusted: false,
      pcWon: false,
      playerBusted: false,
      playerWon: false,
      pcTurn: false,
      playerTurn: true,
    };
  }

  // async functions as class methods

  // delay function to add pauses during game
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Function to shuffle the deck
  async shuffleDeck() {
    try {
      const resp = await fetch(
        `https://www.deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${this.state.deckSize}`
      );
      const data = await resp.json();

      if (!data.success) {
        throw new Error("Failed to shuffle the deck");
      }

      const deck = {
        deck_id: data.deck_id,
        remaining: data.remaining,
      };

      this.setState({ deck });
    } catch (error) {
      console.error("Error shuffling the deck:", error);
    }
  }

  // Function to perform the initial deal
  async deal() {
    const playerCards = [];
    const pcCards = [];

    // Deal two cards to the player and one face-up card to the dealer
    playerCards.push(await this.drawCard());
    pcCards.push(await this.drawCard());
    pcCards[0].showback = true;
    playerCards.push(await this.drawCard());
    pcCards.push(await this.drawCard());

    this.setState({ playerCards, pcCards });
  }

  // Function to draw a card
  async drawCard(count = 1) {
    const deckId = this.state.deck?.deck_id; // Check if deck is defined
    if (!deckId) {
      console.error("Deck is not initialized.");
      return;
    }

    const resp = await fetch(
      `https://www.deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`
    );
    const cardArr = await resp.json();
    const card = cardArr.cards[0];
    card.title = `${card.value} of ${card.suit}`;
    return card;
  }

  // Function to calculate the count of a hand
  getCount(hand) {
    let lowCount = 0;
    let highCount = 0;
    let oneAce = false;

    for (const card of hand) {
      if (
        card.value === "JACK" ||
        card.value === "KING" ||
        card.value === "QUEEN"
      ) {
        lowCount += 10;
        highCount += 10;
      } else if (card.value === "ACE") {
        lowCount += 1;
        highCount += 11;
        if (!oneAce) oneAce = true;
      } else {
        lowCount += Number(card.value);
        highCount += Number(card.value);
      }
    }

    return { lowCount, highCount };
  }

  // Function to handle "Hit Me" action

  hitMe = async () => {
    this.setState({ hitMeDisabled: true });
    const newCard = await this.drawCard();
    const playerCards = [...this.state.playerCards, newCard];
    this.setState({ playerCards });

    const count = this.getCount(playerCards);
    if (count.lowCount >= 22) {
      this.setState({ playerTurn: false, playerBusted: true });
    }

    this.setState({ hitMeDisabled: false });
  };

  // Function to start a new game
  newGame = async () => {
    this.setState({
      pcBusted: false,
      playerBusted: false,
      playerWon: false,
      pcWon: false,
      playerCards: [],
      pcCards: [],
    });
    await this.shuffleDeck();
    await this.deal();
    this.setState({ playerTurn: true });
  };

  // Function to handle the "Stay" action and start the dealer's turn
  stay = async () => {
    this.setState({ playerTurn: false, pcTurn: true });
    this.startDealer();
  };

  // Function to start the dealer's turn
  startDealer = async () => {
    this.setState({ pcText: "The dealer begins their turn..." });
    await this.delay(DEALER_PAUSE);

    this.setState({ pcText: "Let me show my hand..." });
    await this.delay(DEALER_PAUSE);

    // Reveal the dealer's second card
    const pcCards = [...this.state.pcCards];
    pcCards[0].showback = false;
    this.setState({ pcCards });

    const playerCount = this.getCount(this.state.playerCards);
    const playerScore =
      playerCount.lowCount <= 21 ? playerCount.highCount : playerCount.lowCount;

    // Start the dealer's loop
    let dealerLoop = true;
    while (dealerLoop) {
      const count = this.getCount(this.state.pcCards);

      if (count.highCount <= 16) {
        this.setState({ pcText: "Dealer draws a card..." });
        await this.delay(DEALER_PAUSE);

        const newCard = await this.drawCard();
        const pcCards = [...this.state.pcCards, newCard];
        this.setState({ pcCards });
      } else if (count.highCount <= 21) {
        this.setState({ pcText: "Dealer stays..." });
        await this.delay(DEALER_PAUSE);
        dealerLoop = false;
        this.setState({ pcTurn: false });

        if (count.highCount >= playerScore) {
          this.setState({ pcWon: true });
        } else {
          this.setState({ playerWon: true });
        }
      } else {
        dealerLoop = false;
        this.setState({ pcTurn: false, pcBusted: true });
      }
    }
  };

  //  Other functions and render method
  init = async () => {
    await this.shuffleDeck();

    if (this.state.deck) {
      await this.deal();
    }
  };

  componentDidMount() {
    this.init();
  }

  render() {
    return (
      <div className="card-game">
        <div id="pcArea" className="cardArea">
          <h3>Dealer</h3>
          {/*  map function to render pcCards */}
          {this.state.pcCards.map((card, index) => (
            <img
              key={index}
              src={card.showback ? BACK_CARD : card.image}
              title={card.showback ? "" : card.title}
            />
          ))}
        </div>
        <div id="playerArea" className="cardArea">
          <h3>Player</h3>
          {/*  map function to render playerCards */}
          {this.state.playerCards.map((card, index) => (
            <img key={index} src={card.image} title={card.title} />
          ))}
        </div>
        <div id="status">
          {/* Conditional rendering for game status */}
          {this.state.playerTurn && (
            <p>
              What do you do?
              <button onClick={this.hitMe} disabled={this.state.hitMeDisabled}>
                Hit Me!
              </button>
              <button onClick={this.stay}>Stay</button>
            </p>
          )}
          {this.state.pcTurn && (
            <p>
              <span>{this.state.pcText}</span>
            </p>
          )}
          {this.state.playerBusted && (
            <p>
              You busted!
              <button onClick={this.newGame}>New Game</button>
            </p>
          )}
          {this.state.pcBusted && (
            <p>
              Dealer busted - you win!
              <button onClick={this.newGame}>New Game</button>
            </p>
          )}
          {this.state.pcWon && (
            <p>
              Dealer won.
              <button onClick={this.newGame}>New Game</button>
            </p>
          )}
          {this.state.playerWon && (
            <p>
              You won!
              <button onClick={this.newGame}>New Game</button>
            </p>
          )}
        </div>
      </div>
    );
  }
}

export default CardGame;
