"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Clock } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Quest {
  title: string;
  description: string;
  points: number;
  url: string;
  image?: string;
  action?: string;
  dateRange?: string;
  "image-width"?: string;
  "image-height"?: string;
  id?: string;
  progress?: number;
  maxProgress?: number;
  isCompleted?: boolean;
}

export default function QuestsPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questHeader, setQuestHeader] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load quests data
  useEffect(() => {
    const loadQuests = async () => {
      try {
        setIsLoading(true);
        
        // Load quest header (banner) data
        const headerResponse = await fetch('/data/challenges/quests.json');
        if (headerResponse.ok) {
          const headerData = await headerResponse.json();
          setQuestHeader(headerData[0]); // Get first item from array
        }
        
        // Load individual quest items
        const response = await fetch('/data/challenges/quest-items.json');
        if (response.ok) {
          const questsData = await response.json();
          const enrichedQuests = questsData.map((quest: any, index: number) => ({
            ...quest,
            id: `quest-${index + 1}`,
            progress: Math.floor(Math.random() * 5) + 1,
            maxProgress: 10,
            isCompleted: Math.random() > 0.7
          }));
          setQuests(enrichedQuests);
        } else {
          console.error('Failed to load quests:', response.status);
        }
      } catch (error) {
        console.error('Error loading quests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuests();
  }, []);

  const renderQuestCard = (quest: Quest) => {

    return (
      <div
        key={quest.id}
        className="rounded-t-2xl flex flex-col gap-4 transition-all duration-200"
      >
        {/* Row 1: Title and Description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="title2 text-[#313131]">
              {quest.title}
            </div>
          </div>
          <div className="text-[#4F4F4F] body-medium">
            {quest.description}
          </div>
        </div>

        {/* Row 2: Points and Date Range Pills */}
        <div className="flex gap-4 w-full">
          {/* Points */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '32px',
              backgroundColor: 'transparent',
              borderRadius: '16px',
              padding: '6px 12px',
              border: '1px solid #e0e0e0',
              flex: 1
            }}
          >
            <Image
              src="/ep_coin.svg"
              alt="coin"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <div className="body-small text-black">{quest.points}</div>
          </div>

          {/* Date Range */}
          {quest.dateRange ? (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '32px',
                backgroundColor: 'transparent',
                borderRadius: '16px',
                padding: '6px 12px',
                border: '1px solid #e0e0e0',
                flex: 1
              }}
            >
              <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
              <div className="body-small text-black whitespace-nowrap">{quest.dateRange}</div>
            </div>
          ) : (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '32px',
                backgroundColor: 'transparent',
                borderRadius: '16px',
                padding: '6px 12px',
                border: '1px solid #e0e0e0',
                flex: 1
              }}
            >
              <div className="body-small text-black"></div>
            </div>
          )}
        </div>

        {/* Row 3: Action Button - Full Width */}
        <a
          href={quest.url}
          target={quest.url?.startsWith('http') ? '_blank' : '_self'}
          rel={quest.url?.startsWith('http') ? 'noopener noreferrer' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            width: '100%',
            height: '32px',
            backgroundColor: '#ededed',
            borderRadius: '16px',
            padding: '6px 12px',
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            textDecoration: 'none'
          }}
        >
          <div className="body-small text-black">{quest.action || "Buy"}</div>
          <Image
            src="/arrow-right.svg"
            alt="arrow"
            width={12}
            height={12}
            className="w-3 h-3"
          />
        </a>
      </div>
    );
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #EE91B7 26.92%, #FFE600 54.33%, #1BA351 100%)",
      }}
      className="min-h-screen px-2 pt-4 pb-0 font-grotesk"
    >
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <div className="pt-4">
          <button
            onClick={() => router.push('/challenges')}
            style={{
              display: 'flex',
              width: '100%',
              height: '56px',
              padding: '16px',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '24px',
              background: '#FFF'
            }}
            className="text-black hover:opacity-80 transition-opacity"
          >
            <Image
              src="/arrow-left.svg"
              alt="back"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <h4>Quest</h4>
          </button>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-1 space-y-1">
          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-inktrap">Loading quests...</p>
            </div>
          )}

          {/* Quest Header/Banner Card */}
          {!isLoading && questHeader && (
            <div className="bg-white backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="rounded-2xl flex flex-col gap-3 transition-all duration-200">
                {/* Quest Challenge Image - Full Width Above Title */}
                {questHeader.image && (
                  <div className="w-full">
                    <Image
                      src={questHeader.image}
                      alt={questHeader.title}
                      width={parseInt(questHeader["image-width"] || "300")}
                      height={parseInt(questHeader["image-height"] || "200")}
                      className="w-full h-auto object-contain rounded-xl"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <span className="body-small text-gray-600 uppercase tracking-wide">
                    Challenge Quest
                  </span>
                </div>
                {/* Title and Description */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="title2 text-black">
                      {questHeader.title}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-mono line-clamp-1">
                    {questHeader.description}
                  </p>
                </div>
                {/* Complete Quest Button */}
                <a
                  href="https://app.galxe.com/quest/A2w5Zojdy46VKJVvpptTwf/GCzcut8Kwg?refer=quest_parent_collection"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-full font-inktrap font-medium transition-colors duration-200 flex items-center justify-between"
                >
                  <h4>Complete Quest on Galxe</h4>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Quests Section */}
          {!isLoading && (
            <>
             
              <div className="space-y-1">
                {quests.map(quest => (
                  <div key={quest.id} className="bg-white backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    {renderQuestCard(quest)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

