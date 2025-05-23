"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ChevronLeft, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Question, QuestionsBankService, AnswerOption } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import QuestionModal from '@/components/banco-questoes/QuestionModal';

export default function QuestaoDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id ? parseInt(params.id as string) : null;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [disciplineName, setDisciplineName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  
  useEffect(() => {
    if (questionId) {
      loadQuestionData(questionId);
    } else {
      setError('ID da questão inválido');
      setLoading(false);
    }
  }, [questionId]);
  
  const loadQuestionData = async (id: number) => {
    setLoading(true);
    try {
      const questionData = await QuestionsBankService.getQuestionById(id);
      
      if (questionData) {
        setQuestion(questionData);
        
        // Carregar informações da disciplina e assunto
        if (questionData.discipline_id) {
          // Buscar todas as disciplinas e encontrar a correspondente
          const disciplines = await DisciplinesRestService.getDisciplines(true);
          const discipline = disciplines?.find(d => d.id === questionData.discipline_id);
          setDisciplineName(discipline?.name || 'Disciplina não encontrada');
          
          if (questionData.subject_id) {
            const subjects = await DisciplinesRestService.getSubjects(questionData.discipline_id);
            const subject = subjects?.find(s => s.id === questionData.subject_id);
            setSubjectName(subject?.title || subject?.name || 'Assunto não encontrado');
          }
        }
      } else {
        setError('Questão não encontrada');
      }
    } catch (err) {
      console.error('Erro ao carregar questão:', err);
      setError('Erro ao carregar dados da questão');
      
      // Para desenvolvimento, usamos dados de exemplo se houver erro
      const mockQuestions = QuestionsBankService.getMockQuestions();
      const mockQuestion = mockQuestions.find(q => q.id === id);
      
      if (mockQuestion) {
        setQuestion(mockQuestion);
        setDisciplineName('Disciplina Exemplo');
        setSubjectName('Assunto Exemplo');
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteQuestion = async () => {
    if (!questionId) return;
    
    if (!window.confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const success = await QuestionsBankService.deleteQuestion(questionId);
      
      if (success) {
        toast.success('Questão excluída com sucesso');
        router.push('/banco-questoes');
      } else {
        toast.error('Erro ao excluir questão');
      }
    } catch (error) {
      console.error('Erro ao excluir questão:', error);
      toast.error('Ocorreu um erro ao excluir a questão');
    }
  };
  
  // Função compatível com a interface do QuestionModal 
  const handleSaveQuestion = async (updatedQuestion: Question, answerOptions: AnswerOption[]): Promise<boolean> => {
    try {
      // O salvamento acontece dentro do modal
      // Apenas atualizamos os dados locais e saímos do modo de edição
      const savedQuestion = {...updatedQuestion, answer_options: answerOptions};
      setQuestion(savedQuestion);
      setIsEditing(false);
      toast.success('Questão atualizada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar questão:', error);
      toast.error('Ocorreu um erro ao atualizar a questão');
      return false;
    }
  };
  
  // Função para formatar a data
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data desconhecida';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Função para obter o rótulo do tipo de questão
  const getQuestionTypeLabel = (type?: string) => {
    switch (type) {
      case 'multiple_choice': return 'Múltipla Escolha';
      case 'true_false': return 'Verdadeiro/Falso';
      case 'essay': return 'Dissertativa';
      default: return 'Desconhecido';
    }
  };
  
  // Função para obter a cor do nível de dificuldade
  const getDifficultyColor = (difficulty?: string) => {
    const normalizedDifficulty = difficulty?.toLowerCase();
    
    switch (normalizedDifficulty) {
      case 'baixa':
        return 'bg-green-100 text-green-800';
      case 'média':
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Função para normalizar a dificuldade
  const normalizeDifficulty = (difficulty?: string) => {
    if (!difficulty) return 'Não definida';
    
    // Substituir 'media' por 'média' para exibição
    return difficulty.toLowerCase() === 'media' ? 'Média' : 
           difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-500 border-t-transparent mb-3"></div>
          <p className="text-gray-600 font-medium">Carregando questão...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/banco-questoes" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Voltar para o Banco de Questões
        </Link>
        
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar questão</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link 
              href="/banco-questoes" 
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar para o Banco de Questões
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (isEditing && question) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/banco-questoes" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Voltar para o Banco de Questões
        </Link>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <QuestionModal
            isOpen={true}
            onClose={() => setIsEditing(false)}
            onSave={handleSaveQuestion}
            title="Editar Questão"
            initialData={question}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link 
        href="/banco-questoes" 
        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
      >
        <ChevronLeft className="h-5 w-5 mr-1" />
        Voltar para o Banco de Questões
      </Link>
      
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(question?.difficulty)}`}>
                {normalizeDifficulty(question?.difficulty)}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {getQuestionTypeLabel(question?.question_type)}
              </span>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900">
              Questão #{questionId}
            </h1>
            
            <div className="text-sm text-gray-500 mt-2">
              <p>Criada em: {formatDate(question?.created_at)}</p>
              {question?.updated_at && question.updated_at !== question.created_at && (
                <p>Última atualização: {formatDate(question.updated_at)}</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </button>
            
            <button 
              onClick={handleDeleteQuestion}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </button>
          </div>
        </div>
        
        {/* Informações da questão */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Disciplina</h3>
              <p className="text-gray-800">{disciplineName || 'Não especificada'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Assunto</h3>
              <p className="text-gray-800">{subjectName || 'Não especificado'}</p>
            </div>
          </div>
          
          {question?.tags && question.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {question.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Conteúdo da questão */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Enunciado</h2>
          <div className="bg-gray-50 p-5 rounded-lg prose">
            <div dangerouslySetInnerHTML={{ __html: question?.content || 'Conteúdo não disponível' }} />
          </div>
        </div>
        
        {/* Opções de resposta (para questões de múltipla escolha ou V/F) */}
        {question?.question_type !== 'essay' && question?.answer_options && question.answer_options.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {question.question_type === 'multiple_choice' ? 'Alternativas' : 'Opções'}
            </h2>
            <div className="space-y-3">
              {question.answer_options.map((option) => {
                const isCorrect = question.question_type === 'multiple_choice' 
                  ? option.is_correct 
                  : (question.correct_answer === 'true' && option.id?.toString() === 'true') || 
                    (question.correct_answer === 'false' && option.id?.toString() === 'false');

                return (
                  <div
                    key={option.id || Math.random()}
                    className={`p-4 rounded-lg border-2 flex items-start ${
                      isCorrect 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                      isCorrect 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {isCorrect ? '✓' : ''}
                    </div>
                    <div className="flex-1">
                      <div dangerouslySetInnerHTML={{ 
                        __html: question.question_type === 'true_false'
                          ? (option.id?.toString() === 'true' ? 'Verdadeiro' : 'Falso') 
                          : option.text || '' 
                      }} />
                    </div>
                    {isCorrect && (
                      <div className="ml-3 text-sm text-green-600 font-medium">
                        Resposta correta
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Resposta correta para questões dissertativas */}
        {question?.question_type === 'essay' && question?.correct_answer && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Resposta</h2>
            <div className="bg-gray-50 p-5 rounded-lg prose">
              <div dangerouslySetInnerHTML={{ __html: question.correct_answer }} />
            </div>
          </div>
        )}
        
        {/* Explicação */}
        {question?.explanation && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Explicação</h2>
            <div className="bg-gray-50 p-5 rounded-lg prose">
              <div dangerouslySetInnerHTML={{ __html: question.explanation }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 