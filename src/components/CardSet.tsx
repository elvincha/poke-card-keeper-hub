
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CardSetWithCollectionStats } from '@/types/database';

type CardSetProps = CardSetWithCollectionStats;

const CardSet: React.FC<CardSetProps> = ({ 
  id, 
  name, 
  release_date, 
  total_cards, 
  collectedCards, 
  image_url 
}) => {
  const collectionProgress = Math.round((collectedCards / total_cards) * 100);
  
  return (
    <div className="set-card">
      <div className="aspect-[2/1] relative overflow-hidden">
        <img 
          src={image_url} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
          <h3 className="text-white font-bold px-4 pb-3 text-lg">{name}</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Released: {release_date}</span>
          <span>{collectedCards}/{total_cards} cards</span>
        </div>
        <Progress 
          value={collectionProgress} 
          className="h-2 mb-4" 
          indicatorClassName={
            collectionProgress === 100 
              ? "bg-green-500" 
              : collectionProgress > 50 
                ? "bg-pokemon-blue" 
                : "bg-pokemon-red"
          }
        />
        <Link to={`/sets/${id}`}>
          <Button variant="outline" className="w-full border-pokemon-blue text-pokemon-blue hover:bg-pokemon-blue hover:text-white">
            View Set
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default CardSet;
