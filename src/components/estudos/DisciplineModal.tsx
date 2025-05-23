"use client";

import React, { useState } from 'react';
import { X, BookOpen, Palette } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { ThemePicker } from '../ui/ThemeComponents';
import { DisciplinesRestService } from '@/lib/supabase-rest';

interface DisciplineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DisciplineModal: React.FC<DisciplineModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('azul'); // tema padrão
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redefinir formulário ao fechar
  React.useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setTheme('azul');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar campos obrigatórios
      if (!name) {
        throw new Error('O nome da disciplina é obrigatório');
      }

      console.log('Enviando dados para criação de disciplina:', { name, description, theme });

      // Usar a API REST do Supabase diretamente
      const newDiscipline = await DisciplinesRestService.createDiscipline(
        name,
        description || undefined,
        theme
      );

      if (newDiscipline) {
        console.log('Disciplina criada com sucesso:', newDiscipline);
        
        // Adicionar um pequeno atraso para garantir que a atualização no banco foi concluída
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
        
        // Mostrar confirmação com toast
        toast.success(`Disciplina "${name}" adicionada com sucesso!`);
      } else {
        throw new Error('Erro ao criar disciplina');
      }
    } catch (err) {
      console.error('Erro ao criar disciplina:', err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado');
      
      // Mostrar erro como toast
      toast.error(err instanceof Error ? err.message : 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Adicionar Nova Disciplina
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Nome da Disciplina */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Disciplina *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Anatomia"
                    required
                  />
                </div>
              </div>

              {/* Tema da Disciplina */}
              <ThemePicker 
                value={theme}
                onChange={setTheme}
                label="Tema da Disciplina"
              />

              {/* Descrição */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descreva a disciplina e seus tópicos principais"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Adicionar Disciplina'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DisciplineModal; 