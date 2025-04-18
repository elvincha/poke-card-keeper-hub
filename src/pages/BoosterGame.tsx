import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { supabase } from '@/integrations/supabase/client';
import BoosterPack from '@/components/BoosterPack';
import { toast } from 'sonner';
import { CardWithCollectionStatus } from '@/types/database';
import { getUserGameCollection, getGameCollectionCount, addCardToGameCollection } from '@/types/database';

const BoosterGame = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [username, setUsername] = useState('');
  const [boosterCards, setBoosterCards] = useState<CardWithCollectionStatus[]>([]);
  const [isOpened, setIsOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gameCollectionCount, setGameCollectionCount] = useState(0);

  // Check authentication status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setUsername(session.user.id);
        fetchGameCollectionCount(session.user.id);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setIsLoggedIn(true);
          setUsername(session.user.id);
          fetchGameCollectionCount(session.user.id);
        } else {
          setIsLoggedIn(false);
          setUsername('');
          setGameCollectionCount(0);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const fetchGameCollectionCount = async (userId: string) => {
    try {
      // Use our helper function
      const { count, error } = await getGameCollectionCount(userId);
      
      if (error) {
        console.error('Error fetching game collection count:', error);
        return;
      }
      
      setGameCollectionCount(count || 0);
    } catch (error) {
      console.error('Error in fetchGameCollectionCount:', error);
      
      // Fallback method - try to calculate from database using rpc
      try {
        // Use an RPC function that returns a number directly
        const { data, error } = await supabase.rpc('get_game_collection_count_safe', {
          user_id_param: userId
        }) as { data: number | null; error: any };
        
        if (error) {
          console.error('RPC error:', error);
          return;
        }
        
        if (data !== null) {
          setGameCollectionCount(Number(data));
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    }
  };

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setUsername(username);
    setShowAuthModal(false);
    fetchGameCollectionCount(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setGameCollectionCount(0);
  };

  const openBoosterPack = async () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    try {
      // Get 5 random cards from the database
      const { data: randomCards, error } = await supabase
        .from('cards')
        .select('*')
        .order('id')
        .limit(5);

      if (error) throw error;
      if (!randomCards) throw new Error('No cards returned');

      // Check which cards are already in the game collection
      const { data: gameCollection, error: collectionError } = await getUserGameCollection(username);

      if (collectionError || !gameCollection) {
        console.error('Error fetching game collection:', collectionError);
        // Try the RPC function as fallback
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_game_collection_safe', {
          user_id_param: username
        }) as { data: Array<{ card_id: string }> | null; error: any };
          
        if (rpcError) {
          console.error('RPC error:', rpcError);
          // Fallback to a simpler approach
          const cardsWithStatus: CardWithCollectionStatus[] = randomCards.map(card => ({
            ...card,
            owned: false // Default to false if we can't determine
          }));
          
          setBoosterCards(cardsWithStatus);
          setIsOpened(true);
          return;
        }
        
        // Use the RPC result if it exists
        const ownedCardIds = rpcData ? rpcData.map(item => item.card_id) : [];
        
        // Transform raw cards to include ownership status
        const cardsWithStatus: CardWithCollectionStatus[] = randomCards.map(card => ({
          ...card,
          owned: ownedCardIds.includes(card.id)
        }));
        
        setBoosterCards(cardsWithStatus);
      } else {
        // Use the direct REST API result
        const ownedCardIds = gameCollection.map(item => item.card_id) || [];
        
        // Transform raw cards to include ownership status
        const cardsWithStatus: CardWithCollectionStatus[] = randomCards.map(card => ({
          ...card,
          owned: ownedCardIds.includes(card.id)
        }));
        
        setBoosterCards(cardsWithStatus);
      }
      
      setIsOpened(true);
    } catch (error) {
      console.error('Error opening booster pack:', error);
      toast.error('Failed to open booster pack');
    } finally {
      setIsLoading(false);
    }
  };

  const addToGameCollection = async (cardId: string) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    try {
      // Use our helper function
      const { error } = await addCardToGameCollection(username, cardId);

      if (error) {
        // Fallback to RPC
        const { error: rpcError } = await supabase.rpc('add_card_to_game_collection_safe', { 
          user_id_param: username,
          card_id_param: cardId
        }) as { error: any };

        if (rpcError) {
          console.error('RPC error:', rpcError);
          toast.error('Failed to add card to collection');
          return;
        }
      }

      // Update local state
      setBoosterCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId ? { ...card, owned: true } : card
        )
      );
      
      // Update collection count
      setGameCollectionCount(prev => prev + 1);
      
      toast.success('Card added to your game collection!');
    } catch (error) {
      console.error('Error adding card to collection:', error);
      toast.error('Failed to add card to collection');
    }
  };

  const resetBooster = () => {
    setBoosterCards([]);
    setIsOpened(false);
  };

  return (
    <>
      <Layout isLoggedIn={isLoggedIn} onLogin={() => setShowAuthModal(true)} onLogout={handleLogout}>
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-pokemon-red">
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Booster Pack Game</h1>
          <p className="text-gray-600 mb-4">Open booster packs to build your virtual collection!</p>
          
          {isLoggedIn && (
            <div className="mb-6">
              <p className="text-lg font-medium">Your Game Collection: <span className="text-pokemon-blue">{gameCollectionCount}</span> cards</p>
            </div>
          )}
          
          {!isOpened ? (
            <div className="flex flex-col items-center">
              <Button 
                onClick={openBoosterPack} 
                disabled={isLoading}
                className="bg-pokemon-red hover:bg-pokemon-red/90 text-white px-8 py-6 text-xl rounded-2xl shadow-lg mb-4"
              >
                <Package size={24} className="mr-2" />
                Open Booster Pack
              </Button>
              {isLoading && <p>Opening pack...</p>}
              {!isLoggedIn && <p className="text-sm text-gray-500 mt-2">Please login to open boosters</p>}
            </div>
          ) : (
            <BoosterPack 
              cards={boosterCards} 
              onAddToCollection={addToGameCollection}
              onOpenAnother={resetBooster}
            />
          )}
        </div>
      </Layout>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onLogin={handleLogin}
      />
    </>
  );
};

export default BoosterGame;
